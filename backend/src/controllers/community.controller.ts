import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import redis from '../redis';

const router = Router();

/**
 * @route   GET /community/hot-today
 * @desc    Fetch top 5 trending movies based on viewsCount
 * @access  Public
 */
router.get('/hot-today', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = 'community_hot_today';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
      });
      return;
    }

    const hotMovies = await prisma.movie.findMany({
      orderBy: { viewsCount: 'desc' },
      take: 5,
      include: {
        leaderboard: true,
        _count: {
          select: { episodes: true }
        }
      }
    });

    // Cache trending list for 5 minutes
    await redis.set(cacheKey, JSON.stringify(hotMovies), 'EX', 300);

    res.status(200).json({
      success: true,
      data: hotMovies,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /community/stats
 * @desc    Get aggregate community statistics
 * @access  Public
 */
router.get('/stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = 'community_stats';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
      });
      return;
    }

    const [userCount, commentCount, viewAggregate] = await Promise.all([
      prisma.user.count(),
      prisma.comment.count(),
      prisma.movie.aggregate({
        _sum: {
          viewsCount: true
        }
      })
    ]);

    const stats = {
      users: userCount,
      comments: commentCount,
      views: viewAggregate._sum?.viewsCount ?? 0
    };

    // Cache statistics for 10 minutes
    await redis.set(cacheKey, JSON.stringify(stats), 'EX', 600);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
