import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// POST /api/analytics/track - Track user behavior
router.post('/track', authenticateJWT, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { action, metadata } = req.body;
    const userId = req.user?.id || null;

    if (!action) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Action is required.' } });
      return;
    }

    await prisma.userBehaviorLog.create({
      data: {
        userId,
        action,
        metadata: metadata || {},
      },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
