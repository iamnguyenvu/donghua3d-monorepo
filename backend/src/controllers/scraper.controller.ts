import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { scraperService } from '../services/scraper.service';

const router = Router();

/**
 * @route   POST /scraper/sync-movie
 * @desc    Sync a single movie by its Ophim slug
 * @access  Private (Admin Only)
 */
router.post('/sync-movie', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.body;

    if (!slug) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Trường slug bộ phim bắt buộc phải nhập.' },
      });
      return;
    }

    const result = await scraperService.syncMovieBySlug(slug);

    if (!result.success) {
      res.status(500).json({
        success: false,
        error: { code: 'SCRAPE_ERROR', message: result.message },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /scraper/sync-latest
 * @desc    Sync the list of newly updated animations from Ophim page
 * @access  Private (Admin Only)
 */
router.post('/sync-latest', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.body.page as string || '1', 10);

    const result = await scraperService.syncLatestHoathinh(page);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
