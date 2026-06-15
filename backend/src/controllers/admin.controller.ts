import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Secure all admin routes with authentication and Role.ADMIN check
router.use(requireAuth);
router.use(requireRole([Role.ADMIN]));

// 1. GET /api/admin/stats - Quick platform overview statistics
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const range = (req.query.range as string) || '24h';
    const now = new Date();
    let sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default 24h

    if (range === '60m') {
      sinceDate = new Date(now.getTime() - 60 * 60 * 1000);
    } else if (range === '3d') {
      sinceDate = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    } else if (range === '7d') {
      sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '1m') {
      sinceDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === '3m') {
      sinceDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    }

    const [totalUsers, totalMovies, totalComments, totalRatings, flaggedCommentsCount, viewsAgg] = await Promise.all([
      prisma.user.count(),
      prisma.movie.count(),
      prisma.comment.count(),
      prisma.rating.count(),
      prisma.comment.count({ where: { isFlagged: true } }),
      prisma.movie.aggregate({ _sum: { viewsCount: true } })
    ]);
    const totalViews = viewsAgg._sum.viewsCount || 0;

    // Fetch logs and signups in the selected period
    const recentLogs = await prisma.userBehaviorLog.findMany({
      where: {
        createdAt: { gte: sinceDate },
        action: 'PAGE_VIEW'
      },
      select: { createdAt: true, metadata: true }
    });

    const recentSignups = await prisma.user.findMany({
      where: {
        createdAt: { gte: sinceDate }
      },
      select: { createdAt: true }
    });

    // Initialize trendData map
    const trendMap: Record<string, { views: number, signups: number }> = {};
    if (range === '60m') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 5 * 60 * 1000);
        const mins = Math.floor(d.getMinutes() / 5) * 5;
        d.setMinutes(mins);
        const dateStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        trendMap[dateStr] = { views: 0, signups: 0 };
      }
    } else if (range === '24h') {
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 60 * 60 * 1000);
        const dateStr = `${d.getHours().toString().padStart(2, '0')}:00`;
        trendMap[dateStr] = { views: 0, signups: 0 };
      }
    } else {
      let daysLimit = 7;
      if (range === '3d') daysLimit = 3;
      else if (range === '1m') daysLimit = 30;
      else if (range === '3m') daysLimit = 90;

      for (let i = daysLimit - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        trendMap[dateStr] = { views: 0, signups: 0 };
      }
    }

    recentLogs.forEach(log => {
      let dateStr = '';
      if (range === '60m') {
        const mins = Math.floor(log.createdAt.getMinutes() / 5) * 5;
        const d = new Date(log.createdAt);
        d.setMinutes(mins);
        dateStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      } else if (range === '24h') {
        dateStr = `${log.createdAt.getHours().toString().padStart(2, '0')}:00`;
      } else {
        dateStr = log.createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }
      if (trendMap[dateStr]) trendMap[dateStr].views++;
    });

    recentSignups.forEach(u => {
      let dateStr = '';
      if (range === '60m') {
        const mins = Math.floor(u.createdAt.getMinutes() / 5) * 5;
        const d = new Date(u.createdAt);
        d.setMinutes(mins);
        dateStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      } else if (range === '24h') {
        dateStr = `${u.createdAt.getHours().toString().padStart(2, '0')}:00`;
      } else {
        dateStr = u.createdAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
      }
      if (trendMap[dateStr]) trendMap[dateStr].signups++;
    });

    const trendData = Object.keys(trendMap).map(date => ({
      date,
      views: trendMap[date].views,
      signups: trendMap[date].signups,
    }));

    // Aggregate Geo location distribution
    const geoCounts: Record<string, number> = {};
    const osCounts: Record<string, number> = {};
    const browserCounts: Record<string, number> = {};

    recentLogs.forEach(log => {
      const meta = log.metadata as any;
      const country = meta?.country || 'Việt Nam';
      const os = meta?.os || 'Windows';
      const browser = meta?.browser || 'Chrome';

      geoCounts[country] = (geoCounts[country] || 0) + 1;
      osCounts[os] = (osCounts[os] || 0) + 1;
      browserCounts[browser] = (browserCounts[browser] || 0) + 1;
    });

    const geoStats = Object.keys(geoCounts).map(name => ({
      name,
      value: geoCounts[name]
    })).sort((a, b) => b.value - a.value).slice(0, 5);

    const osStats = Object.keys(osCounts).map(name => ({
      name,
      value: osCounts[name]
    })).sort((a, b) => b.value - a.value);

    const browserStats = Object.keys(browserCounts).map(name => ({
      name,
      value: browserCounts[name]
    })).sort((a, b) => b.value - a.value);

    // Aggregate Genre views ranking
    const genres = await prisma.genre.findMany({
      select: {
        name: true,
        movies: {
          select: {
            movie: {
              select: {
                viewsCount: true
              }
            }
          }
        }
      }
    });

    const genreStats = genres.map(g => {
      const views = g.movies.reduce((acc, link) => acc + (link.movie?.viewsCount || 0), 0);
      return {
        name: g.name,
        views
      };
    }).sort((a, b) => b.views - a.views).slice(0, 8);

    // Real active sessions in last 15 minutes
    const fifteenMinsAgo = new Date(now.getTime() - 15 * 60000);
    const activeSessions = await prisma.userBehaviorLog.count({
      where: { createdAt: { gte: fifteenMinsAgo } }
    });

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalMovies,
        totalComments,
        totalRatings,
        flaggedCommentsCount,
        activeSessions,
        totalViews,
        trends: trendData,
        geoStats,
        deviceStats: {
          os: osStats,
          browser: browserStats
        },
        genreStats
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

// 9. GET /api/admin/scraping-logs - Retrieve background scraping execution logs
router.get('/scraping-logs', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const logs = await prisma.scrapingLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 50,
    });

    res.status(200).json({
      success: true,
      data: logs,
    });
  } catch (err) {
    next(err);
  }
});

// 10. GET /api/admin/scraping-queue - Get all items in queue
router.get('/scraping-queue', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const queue = await prisma.scrapingQueue.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.status(200).json({ success: true, data: queue });
  } catch (err) { next(err); }
});

// 11. POST /api/admin/scraping-queue/add - Add task to queue
router.post('/scraping-queue/add', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sourceUrl, audioTrack, targetMovieId, targetEpisodeNumber } = req.body;
    if (!sourceUrl) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'URL nguồn không được để trống.' } });
      return;
    }
    const task = await prisma.scrapingQueue.create({
      data: {
        sourceUrl,
        title: targetMovieId || 'N/A',
        episodeNum: targetEpisodeNumber || 0,
        audioTrack: audioTrack || 'VIETSUB',
        status: 'PENDING',
      },
    });
    res.status(201).json({ success: true, data: task });
  } catch (err) { next(err); }
});

// 12. POST /api/admin/scraping-queue/trigger - Trigger queue
router.post('/scraping-queue/trigger', async (_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.status(200).json({ success: true, data: { message: 'Đã kích hoạt worker (Mock)!', processedCount: 0 } });
  } catch (err) { next(err); }
});

export default router;
