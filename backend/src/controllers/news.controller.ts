import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';
import { newsScraperService } from '../services/news-scraper.service';
import { Role } from '@prisma/client';
import redis from '../redis';

const router = Router();

// 1. GET /api/news - List all news articles
router.get('/', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const cacheKey = 'news_list';
    const cachedData = await redis.get(cacheKey);

    if (cachedData) {
      res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
      });
      return;
    }

    const newsList = await prisma.news.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Cache the news list for 15 minutes
    await redis.set(cacheKey, JSON.stringify(newsList), 'EX', 900);

    res.status(200).json({
      success: true,
      data: newsList,
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/news/:slug - Fetch single news article detail
router.get('/:slug', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;

    const newsItem = await prisma.news.findUnique({
      where: { slug }
    });

    if (!newsItem) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bài viết không tồn tại.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: newsItem,
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/news/sync - Manually trigger RSS synchronization (Admin Only)
router.post('/sync', requireRole([Role.ADMIN]), async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const syncRes = await newsScraperService.syncNewsFromFeed();
    
    // Purge news cache on successful sync
    await redis.del('news_list');

    res.status(200).json({
      success: true,
      message: syncRes.message,
      data: { count: syncRes.count }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
