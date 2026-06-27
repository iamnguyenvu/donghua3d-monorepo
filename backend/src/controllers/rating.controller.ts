import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { RatingType, Role } from '@prisma/client';
import { cultivationService } from '../services/cultivation.service';

const router = Router();

/**
 * Mathematical Recalculation Engine: Cascades ratings from Episode to Movie level.
 * Implements strict, reputation-weighted calculations as defined in data_spec 02.
 */
async function recalculateMovieAndEpisodeRatings(movieId: string, episodeId?: string | null): Promise<void> {
  console.log(`[Rating Engine] Recalculating ratings for Movie [${movieId}]...`);

  // 1. Recalculate Episode Level Ratings if episodeId is provided
  if (episodeId) {
    // Separate calculation for EXPERT and USER ratings
    const expertStats = await prisma.rating.aggregate({
      where: { episodeId, ratingType: RatingType.EXPERT, isCredible: true, isApproved: true },
      _avg: { value: true },
      _count: true,
    });

    const audienceStats = await prisma.rating.aggregate({
      where: { episodeId, ratingType: RatingType.USER, isCredible: true, isApproved: true },
      _avg: { value: true },
      _count: true,
    });

    const overallStats = await prisma.rating.aggregate({
      where: { episodeId, isCredible: true, isApproved: true },
      _avg: { value: true },
      _count: true,
    });

    await prisma.episode.update({
      where: { id: episodeId },
      data: {
        expertRating: expertStats._avg.value ?? 0.0,
        audienceRating: audienceStats._avg.value ?? 0.0,
        rating: overallStats._avg.value ?? 0.0,
      },
    });
    console.log(`[Rating Engine] Episode [${episodeId}] scores updated: overall=${overallStats._avg.value}`);
  }

  // 2. Cascade Upwards: Recalculate Parent Movie Level Ratings
  // Formula: Movie rating is the average of its episodes with valid participating scores.
  const activeEpisodes = await prisma.episode.findMany({
    where: {
      movieId,
      rating: { gt: 0.0 }, // Only include episodes that have valid ratings (non-null / non-zero)
    },
    select: { rating: true, expertRating: true, audienceRating: true },
  });

  if (activeEpisodes.length > 0) {
    const totalEpisodesCount = activeEpisodes.length;
    const avgOverall = activeEpisodes.reduce((acc, curr) => acc + curr.rating, 0) / totalEpisodesCount;
    const avgExpert = activeEpisodes.reduce((acc, curr) => acc + curr.expertRating, 0) / totalEpisodesCount;
    const avgAudience = activeEpisodes.reduce((acc, curr) => acc + curr.audienceRating, 0) / totalEpisodesCount;

    await prisma.movie.update({
      where: { id: movieId },
      data: {
        rating: avgOverall,
        expertRating: avgExpert,
        audienceRating: avgAudience,
      },
    });
    console.log(`[Rating Engine] Parent Movie [${movieId}] cascaded update: rating=${avgOverall}`);
  } else {
    // If no episodes are rated yet, fallback to direct movie-level rating averages if they exist
    const movieDirectStats = await prisma.rating.aggregate({
      where: { movieId, episodeId: null, isCredible: true, isApproved: true },
      _avg: { value: true },
    });

    await prisma.movie.update({
      where: { id: movieId },
      data: {
        rating: movieDirectStats._avg.value ?? 0.0,
      },
    });
  }
}

// 1. POST /api/ratings - Create or Update Rating Review
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { movieId, episodeId, value, review } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    if (!movieId || !value) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Mã phim và điểm đánh giá (1-10) bắt buộc phải nhập.' },
      });
      return;
    }

    const ratingVal = parseInt(value as string, 10);
    if (ratingVal < 1 || ratingVal > 10) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Điểm đánh giá phải nằm trong khoảng từ 1 đến 10.' },
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

    // Check rating type based on user role
    const ratingType = userRole === Role.EXPERT ? RatingType.EXPERT : RatingType.USER;

    // Check user reputation score for anti-spam engine (sandbox rule: reputationScore < 30 is not credible)
    const dbUser = await prisma.user.findUnique({ where: { id: userId } });
    const isCredible = (dbUser?.reputationScore ?? 100) >= 30;

    // Standard upsert query
    const existingRating = await prisma.rating.findFirst({
      where: {
        userId,
        movieId,
        episodeId: episodeId || null,
      },
    });

    let rating;
    if (existingRating) {
      rating = await prisma.rating.update({
        where: { id: existingRating.id },
        data: {
          value: ratingVal,
          review,
          isCredible,
        },
        include: {
          user: {
            select: { id: true, email: true, role: true, reputationScore: true },
          },
        },
      });
    } else {
      rating = await prisma.rating.create({
        data: {
          userId,
          movieId,
          episodeId: episodeId || null,
          ratingType,
          value: ratingVal,
          review,
          isCredible,
          isApproved: true,
        },
        include: {
          user: {
            select: { id: true, email: true, role: true, reputationScore: true },
          },
        },
      });
    }

    // Recalculate episode and movie statistics in background
    recalculateMovieAndEpisodeRatings(movieId, episodeId)
      .catch((err) => console.error('[Rating Engine Error] Failed background recalculation:', err.message));

    // Award +30 EXP and +5 Linh Thạch in the background
    cultivationService.awardCultivationRewards(userId, 30, 5)
      .catch((err) => console.error('[Cultivation Reward Error] Failed to reward rating:', err.message));

    res.status(200).json({
      success: true,
      data: rating,
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/ratings/movie/:movieId - Fetch all reviews for a movie
router.get('/movie/:movieId', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { movieId } = req.params;

    const reviews = await prisma.rating.findMany({
      where: { movieId, isApproved: true },
      include: {
        user: {
          select: { id: true, email: true, role: true, reputationScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const ratingCount = await prisma.rating.count({
      where: { movieId, isCredible: true, isApproved: true }
    });

    res.status(200).json({
      success: true,
      data: reviews,
      meta: { totalRatings: ratingCount }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
export { recalculateMovieAndEpisodeRatings };
