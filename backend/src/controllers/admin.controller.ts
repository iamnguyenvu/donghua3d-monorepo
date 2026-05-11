import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Secure all admin routes with authentication and Role.ADMIN check
router.use(requireAuth);
router.use(requireRole([Role.ADMIN]));

// 1. GET /api/admin/stats - Quick platform overview statistics
router.get('/stats', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [totalUsers, totalMovies, totalComments, totalRatings, flaggedCommentsCount] = await Promise.all([
      prisma.user.count(),
      prisma.movie.count(),
      prisma.comment.count(),
      prisma.rating.count(),
      prisma.comment.count({ where: { isFlagged: true } }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalMovies,
        totalComments,
        totalRatings,
        flaggedCommentsCount,
      }
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/admin/users - Get all registered users
router.get('/users', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        reputationScore: true,
        createdAt: true,
        veteranSince: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/admin/users/:id/role - Update user role
router.post('/users/:id/role', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(Role).includes(role as Role)) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Quyền (role) không hợp lệ.' },
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: { id: true, email: true, role: true },
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/admin/users/:id/ban - Ban a user (set reputation to -100)
router.post('/users/:id/ban', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent banning self
    if (id === req.user!.id) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Bạn không thể tự khóa tài khoản của chính mình!' },
      });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { reputationScore: -100 },
      select: { id: true, email: true, reputationScore: true },
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/admin/users/:id/unban - Unban a user (reset reputation to 100)
router.post('/users/:id/unban', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { reputationScore: 100 },
      select: { id: true, email: true, reputationScore: true },
    });

    res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    next(err);
  }
});

// 6. GET /api/admin/comments/flagged - Get comments flagged as inappropriate
router.get('/comments/flagged', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const flaggedComments = await prisma.comment.findMany({
      where: { isFlagged: true },
      include: {
        user: { select: { id: true, email: true } },
        movie: { select: { id: true, title: true } },
        episode: { select: { id: true, episodeNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: flaggedComments,
    });
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/admin/comments/:id/dismiss-flag - Dismiss flags on comment
router.post('/comments/:id/dismiss-flag', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: { isFlagged: false },
    });

    res.status(200).json({
      success: true,
      data: updatedComment,
    });
  } catch (err) {
    next(err);
  }
});

// 8. DELETE /api/admin/comments/:id - Permanently delete comment
router.delete('/comments/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.comment.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa bình luận thành công khỏi hệ thống.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
