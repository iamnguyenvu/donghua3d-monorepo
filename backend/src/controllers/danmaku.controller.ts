import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';

const router = Router();

// 1. GET /api/danmaku/episode/:episodeId - Fetch all danmakus for an episode
router.get('/episode/:episodeId', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { episodeId } = req.params;

    if (!episodeId) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Mã tập phim bắt buộc phải nhập.' },
      });
      return;
    }

    const danmakus = await prisma.danmaku.findMany({
      where: { episodeId },
      orderBy: { time: 'asc' }, // Order by time offset in video timeline
      select: {
        id: true,
        text: true,
        time: true,
        color: true,
        style: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: danmakus,
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/danmaku - Post a new danmaku (authenticated)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { movieId, episodeId, text, time, color, style } = req.body;
    const userId = req.user!.id;

    if (!movieId || !episodeId || !text || time === undefined) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Thiếu các thông tin bắt buộc (movieId, episodeId, text, time).' },
      });
      return;
    }

    // Verify Episode exists and belongs to the Movie
    const episode = await prisma.episode.findUnique({
      where: { id: episodeId },
    });

    if (!episode || episode.movieId !== movieId) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tập phim không hợp lệ hoặc không thuộc bộ phim này.' },
      });
      return;
    }

    const danmaku = await prisma.danmaku.create({
      data: {
        userId,
        movieId,
        episodeId,
        text,
        time: parseFloat(time),
        color: color || '#ffffff',
        style: style || 'scroll',
      },
      select: {
        id: true,
        text: true,
        time: true,
        color: true,
        style: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: danmaku,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
