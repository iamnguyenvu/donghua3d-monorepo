import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   GET /watchlist
 * @desc    Get user's personal movie watchlist (Danh sách của tôi)
 * @access  Private
 */
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;

    const userWatchlist = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        movie: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Extract the movie objects
    const movies = userWatchlist.map((item) => item.movie);

    res.status(200).json({
      success: true,
      data: movies,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /watchlist/:movieId
 * @desc    Add a movie to the watchlist
 * @access  Private
 */
router.post('/:movieId', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { movieId } = req.params;

    // Check if the movie exists
    const movie = await prisma.movie.findUnique({
      where: { id: movieId },
    });

    if (!movie) {
      res.status(404).json({
        success: false,
        error: {
          code: 'MOVIE_NOT_FOUND',
          message: 'Không tìm thấy bộ phim này trong hệ thống.',
        },
      });
      return;
    }

    // Check if already in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        unique_user_movie_watchlist: {
          userId,
          movieId,
        },
      },
    });

    if (existing) {
      res.status(200).json({
        success: true,
        message: 'Phim đã tồn tại trong danh sách của bạn.',
      });
      return;
    }

    // Create watchlist entry
    await prisma.watchlist.create({
      data: {
        userId,
        movieId,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Đã thêm vào Danh sách của tôi.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /watchlist/:movieId
 * @desc    Remove a movie from the watchlist
 * @access  Private
 */
router.delete('/:movieId', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { movieId } = req.params;

    // Check if in watchlist
    const existing = await prisma.watchlist.findUnique({
      where: {
        unique_user_movie_watchlist: {
          userId,
          movieId,
        },
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: {
          code: 'WATCHLIST_ITEM_NOT_FOUND',
          message: 'Phim không nằm trong danh sách của bạn.',
        },
      });
      return;
    }

    // Delete watchlist entry
    await prisma.watchlist.delete({
      where: {
        unique_user_movie_watchlist: {
          userId,
          movieId,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa khỏi Danh sách của tôi.',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /watchlist/check/:movieId
 * @desc    Check if a movie is in the user's watchlist
 * @access  Private
 */
router.get('/check/:movieId', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { movieId } = req.params;

    const existing = await prisma.watchlist.findUnique({
      where: {
        unique_user_movie_watchlist: {
          userId,
          movieId,
        },
      },
    });

    res.status(200).json({
      success: true,
      isAdded: !!existing,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
