import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';
import { cultivationService } from '../services/cultivation.service';

const router = Router();

// 0. GET /api/comments/recent - Fetch 5 most recent comments globally for homepage sidebar
router.get('/recent', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const comments = await prisma.comment.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true },
        },
        movie: {
          select: { id: true, title: true, slug: true },
        },
        episode: {
          select: { id: true, episodeNumber: true },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (err) {
    next(err);
  }
});

// 1. GET /api/comments - Fetch flat comment listings (Frontend handles tree nesting)
router.get('/movie/:movieId', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { movieId } = req.params;
    const { episodeId } = req.query;

    const queryConditions: any = { movieId };
    if (episodeId) {
      queryConditions.episodeId = episodeId as string;
    }

    const comments = await prisma.comment.findMany({
      where: queryConditions,
      include: {
        user: {
          select: { id: true, email: true, role: true, reputationScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      data: comments,
    });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/comments - Post New Comment/Reply
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { movieId, episodeId, parentId, content, isSpoiler } = req.body;
    const userId = req.user!.id;

    if (!movieId || !content) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Mã phim và nội dung bình luận bắt buộc phải nhập.' },
      });
      return;
    }

    // Verify parent comment exists if replying
    if (parentId) {
      const parentComment = await prisma.comment.findUnique({ where: { id: parentId } });
      if (!parentComment) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Bình luận gốc không tồn tại.' },
        });
        return;
      }
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        movieId,
        episodeId: episodeId || null,
        parentId: parentId || null,
        content,
        isSpoiler: isSpoiler ?? false,
      },
      include: {
        user: {
          select: { id: true, email: true, role: true, reputationScore: true },
        },
      },
    });

    // Award +10 EXP and +2 Linh Thạch in the background
    cultivationService.awardCultivationRewards(userId, 10, 2)
      .catch((err) => console.error('[Cultivation Reward Error] Failed to reward comment:', err.message));

    res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (err) {
    next(err);
  }
});

// 3. PUT /api/comments/:id/spoiler - Toggle Spoiler Flag (Author or Admin Only)
router.put('/:id/spoiler', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { isSpoiler } = req.body;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bình luận không tồn tại.' },
      });
      return;
    }

    // Authorization check: Only author or admin can modify spoiler state
    if (comment.userId !== userId && userRole !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền sửa trạng thái của bình luận này.' },
      });
      return;
    }

    const updatedComment = await prisma.comment.update({
      where: { id },
      data: {
        isSpoiler: isSpoiler ?? !comment.isSpoiler,
      },
    });

    res.status(200).json({
      success: true,
      data: updatedComment,
    });
  } catch (err) {
    next(err);
  }
});

// 4. POST /api/comments/:id/flag - Report/Flag Comment
router.post('/:id/flag', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bình luận không tồn tại.' },
      });
      return;
    }

    const flaggedComment = await prisma.comment.update({
      where: { id },
      data: {
        isFlagged: true,
      },
    });

    res.status(200).json({
      success: true,
      data: {
        id: flaggedComment.id,
        isFlagged: flaggedComment.isFlagged,
        message: 'Bình luận đã được đánh dấu báo cáo thành công.',
      }
    });
  } catch (err) {
    next(err);
  }
});

// 5. DELETE /api/comments/:id - Delete Comment (Author or Admin Only)
router.delete('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bình luận không tồn tại.' },
      });
      return;
    }

    if (comment.userId !== userId && userRole !== Role.ADMIN) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Bạn không có quyền xóa bình luận này.' },
      });
      return;
    }

    await prisma.comment.delete({ where: { id } });

    res.status(200).json({
      success: true,
      data: { id, message: 'Xóa bình luận thành công.' },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
