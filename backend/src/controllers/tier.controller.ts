import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { Tier } from '@prisma/client';

const router = Router();

// Define mathematical weights for each tier (02_data_spec.md: Section 3.3)
const TIER_WEIGHTS = {
  [Tier.S]: 100,
  [Tier.A]: 80,
  [Tier.B]: 60,
  [Tier.C]: 40,
  [Tier.D]: 20,
  [Tier.F]: 0,
};

/**
 * Calculates and caches the overall tier score and tier rank letter for a specific Movie.
 */
async function recalculateGlobalMovieTier(movieId: string): Promise<void> {
  console.log(`[Tier Engine] Recalculating global leaderboard cache for Movie [${movieId}]...`);

  // 1. Count votes for each tier
  const votes = await prisma.personalTierList.groupBy({
    by: ['tier'],
    where: { movieId },
    _count: { id: true },
  });

  const counts = {
    [Tier.S]: 0,
    [Tier.A]: 0,
    [Tier.B]: 0,
    [Tier.C]: 0,
    [Tier.D]: 0,
    [Tier.F]: 0,
  };

  votes.forEach((v) => {
    counts[v.tier] = v._count.id;
  });

  const sumCounts = Object.values(counts).reduce((a, b) => a + b, 0);

  let tierScore = 0.0;
  let globalTier: Tier = Tier.C; // Default fallback tier

  if (sumCounts > 0) {
    // Apply weighted tier equation
    const weightedSum =
      counts[Tier.S] * TIER_WEIGHTS[Tier.S] +
      counts[Tier.A] * TIER_WEIGHTS[Tier.A] +
      counts[Tier.B] * TIER_WEIGHTS[Tier.B] +
      counts[Tier.C] * TIER_WEIGHTS[Tier.C] +
      counts[Tier.D] * TIER_WEIGHTS[Tier.D] +
      counts[Tier.F] * TIER_WEIGHTS[Tier.F];

    tierScore = weightedSum / sumCounts;

    // Map numeric score back to global Tier Letter
    if (tierScore >= 90) {
      globalTier = Tier.S;
    } else if (tierScore >= 80) {
      globalTier = Tier.A;
    } else if (tierScore >= 60) {
      globalTier = Tier.B;
    } else if (tierScore >= 40) {
      globalTier = Tier.C;
    } else if (tierScore >= 20) {
      globalTier = Tier.D;
    } else {
      globalTier = Tier.F;
    }
  }

  // 2. Update Global Tier Leaderboard cache
  await prisma.globalTierLeaderboard.upsert({
    where: { movieId },
    update: {
      s_tier_count: counts[Tier.S],
      a_tier_count: counts[Tier.A],
      b_tier_count: counts[Tier.B],
      c_tier_count: counts[Tier.C],
      d_tier_count: counts[Tier.D],
      f_tier_count: counts[Tier.F],
      tierScore,
      globalTier,
      lastCalculated: new Date(),
    },
    create: {
      movieId,
      s_tier_count: counts[Tier.S],
      a_tier_count: counts[Tier.A],
      b_tier_count: counts[Tier.B],
      c_tier_count: counts[Tier.C],
      d_tier_count: counts[Tier.D],
      f_tier_count: counts[Tier.F],
      tierScore,
      globalTier,
    },
  });

  // 3. Recalculate rank order for all movies on the leaderboard
  const leaderboards = await prisma.globalTierLeaderboard.findMany({
    orderBy: { tierScore: 'desc' },
  });

  for (let idx = 0; idx < leaderboards.length; idx++) {
    await prisma.globalTierLeaderboard.update({
      where: { movieId: leaderboards[idx].movieId },
      data: {
        rank: idx + 1,
      },
    });
  }

  console.log(`[Tier Engine] Leaderboard recalculated. Movie [${movieId}] score=${tierScore}, globalTier=${globalTier}`);
}

// 1. GET /api/tiers/personal - Fetch Personal Tier Listings for the logged-in user
router.get('/personal', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.id;

    const tiers = await prisma.personalTierList.findMany({
      where: { userId },
      include: {
        movie: {
          select: { id: true, title: true, posterUrl: true, rating: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: tiers,
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/tiers/personal - Save or update personal movie placement on the tier board
router.post('/personal', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { movieId, tier, notes } = req.body;
    const userId = req.user!.id;

    if (!movieId || !tier) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Mã phim và xếp hạng tier (S, A, B, C, D, F) bắt buộc phải có.' },
      });
      return;
    }

    const tierVal = tier.toUpperCase() as Tier;
    if (!Object.values(Tier).includes(tierVal)) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Hạng tier không hợp lệ. Phải thuộc S, A, B, C, D, F.' },
      });
      return;
    }

    // Verify Movie exists
    const movie = await prisma.movie.findUnique({ where: { id: movieId } });
    if (!movie) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bộ phim không tồn tại.' },
      });
      return;
    }

    // Standard upsert query
    const existingTier = await prisma.personalTierList.findUnique({
      where: {
        unique_user_movie_tier: {
          userId,
          movieId,
        },
      },
    });

    let result;
    if (existingTier) {
      result = await prisma.personalTierList.update({
        where: { id: existingTier.id },
        data: {
          tier: tierVal,
          notes,
        },
      });
    } else {
      result = await prisma.personalTierList.create({
        data: {
          userId,
          movieId,
          tier: tierVal,
          notes,
        },
      });
    }

    // Recalculate global tier caches in background
    recalculateGlobalMovieTier(movieId)
      .catch((err) => console.error('[Tier Engine Error] Background calculation failed:', err.message));

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/tiers/leaderboard - Fetch Cached Global Tier Leaderboard (High-Performance Read)
router.get('/leaderboard', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const leaderboard = await prisma.globalTierLeaderboard.findMany({
      include: {
        movie: {
          select: { id: true, title: true, posterUrl: true, rating: true, studio: true, releaseYear: true },
        },
      },
      orderBy: { rank: 'asc' },
    });

    res.status(200).json({
      success: true,
      data: leaderboard,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
export { recalculateGlobalMovieTier };
