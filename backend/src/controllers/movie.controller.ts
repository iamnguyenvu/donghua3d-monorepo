import { Router, Response, NextFunction } from 'express';
import { prisma } from '../db';
import { AuthenticatedRequest, requireAuth, requireRole } from '../middleware/auth.middleware';
import { encodingService } from '../services/encoding.service';
import { storageService } from '../services/storage.service';
import { Role } from '@prisma/client';

const router = Router();

// 1. GET /api/movies - Query Catalog List
router.get('/movies', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, search, sort } = req.query;

    const whereClause: any = {};
    if (year) {
      whereClause.releaseYear = parseInt(year as string, 10);
    }
    if (search) {
      const searchStr = search as string;
      whereClause.OR = [
        { title: { contains: searchStr, mode: 'insensitive' } },
        { altTitles: { array_contains: searchStr } }
      ];
    }

    let orderByClause: any = { rating: 'desc' };
    if (sort === 'releaseYear') {
      orderByClause = { releaseYear: 'desc' };
    } else if (sort === 'title') {
      orderByClause = { title: 'asc' };
    }

    const movies = await prisma.movie.findMany({
      where: whereClause,
      orderBy: orderByClause,
      include: {
        leaderboard: true,
        _count: {
          select: { episodes: true }
        },
        episodes: {
          orderBy: { episodeNumber: 'desc' },
          take: 1, 
          select: { createdAt: true }
        }
      }
    });

    const mappedMovies = movies.map((m: any) => {
      const lastEpisodeAt = m.episodes?.[0]?.createdAt ?? m.createdAt;
      return {
        ...m,
        updatedAt: lastEpisodeAt,
        episodeCount: m._count?.episodes ?? 0
      };
    });

    res.status(200).json({
      success: true,
      data: mappedMovies,
    });
  } catch (err) {
    next(err);
  }
});

// 2. GET /api/movies/:id - Movie Details
router.get('/movies/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const movie = await prisma.movie.findUnique({
      where: { id },
      include: {
        episodes: {
          orderBy: { episodeNumber: 'asc' },
        },
        leaderboard: true,
      },
    });

    if (!movie) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bộ phim không tồn tại.' },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (err) {
    next(err);
  }
});

// 3. POST /api/movies - Create New Movie Catalog (Admin Only)
router.post('/movies', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, altTitles, description, studio, releaseYear, posterUrl, bannerUrl, imdbRating } = req.body;

    if (!title || !releaseYear) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Tên phim và năm sản xuất bắt buộc phải nhập.' },
      });
      return;
    }

    const movie = await prisma.movie.create({
      data: {
        title,
        altTitles: altTitles ?? [],
        description,
        studio,
        releaseYear: parseInt(releaseYear as string, 10),
        posterUrl,
        bannerUrl,
        imdbRating: imdbRating ? parseFloat(imdbRating as string) : null,
      },
    });

    // Automatically initialize leaderboard state
    await prisma.globalTierLeaderboard.create({
      data: {
        movieId: movie.id,
        s_tier_count: 0,
        a_tier_count: 0,
        b_tier_count: 0,
        c_tier_count: 0,
        d_tier_count: 0,
        f_tier_count: 0,
        tierScore: 0.0,
        globalTier: 'C',
      }
    });

    res.status(201).json({
      success: true,
      data: movie,
    });
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/episodes/:id - Episode Details & Watch Progress
router.get('/episodes/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const episode = await prisma.episode.findUnique({
      where: { id },
      include: { sources: { orderBy: { priority: 'desc' } } }
    });

    if (!episode) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tập phim không tồn tại.' },
      });
      return;
    }

    // Proactively increment parent movie's viewsCount in the background (non-blocking)
    prisma.movie.update({
      where: { id: episode.movieId },
      data: { viewsCount: { increment: 1 } }
    }).catch(err => {
      console.error(`[Views Counter Error] Failed to increment views count for movie ${episode.movieId}:`, err.message);
    });

    // Resolve user watch progress if logged in
    let watchProgress = 0.0;
    let watchCompleted = false;
    let isVip = false;

    if (req.user) {
      const dbUser = await prisma.user.findUnique({
        where: { id: req.user.id }
      });
      if (dbUser) {
        isVip = dbUser.role === Role.ADMIN || dbUser.role === Role.EXPERT || dbUser.reputationScore >= 110;
      }

      const history = await prisma.watchHistory.findUnique({
        where: {
          unique_user_watch_progress: {
            userId: req.user.id,
            episodeId: episode.id,
          },
        },
      });
      if (history) {
        watchProgress = history.progress;
        watchCompleted = history.completed;
      }
    }

    // Handle anti-leech for 4K video using secure presigned URLs (1 hour expiration)
    let finalVideoUrl4k: string | null = null;
    let isVipOnly = false;

    if (episode.videoUrl4k) {
      isVipOnly = true; // Yes, 4K quality is VIP-only
      if (isVip) {
        // Generate presigned URL valid for 1 hour (3600 seconds)
        finalVideoUrl4k = await storageService.generatePresignedUrl(episode.videoUrl4k, 3600);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        ...episode,
        videoUrl4k: finalVideoUrl4k,
        isVipOnly,
        watchHistory: {
          progress: watchProgress,
          completed: watchCompleted,
        }
      },
    });
  } catch (err) {
    next(err);
  }
});

// 5. POST /api/movies/:id/episodes - Create New Episode (Admin Only)
router.post('/movies/:id/episodes', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { episodeNumber, title, description, videoUrl, introStart, introEnd, outroStart, outroEnd, thumbnail } = req.body;

    if (!episodeNumber || !title || !videoUrl) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Số tập, tiêu đề và liên kết video bắt buộc phải nhập.' },
      });
      return;
    }

    const movie = await prisma.movie.findUnique({ where: { id } });
    if (!movie) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Bộ phim không tồn tại.' },
      });
      return;
    }

    // Check unique constraint manually for clean error responses
    const existingEp = await prisma.episode.findUnique({
      where: {
        unique_movie_episode: {
          movieId: movie.id,
          episodeNumber: parseInt(episodeNumber as string, 10),
        },
      },
    });

    if (existingEp) {
      res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: `Tập phim số ${episodeNumber} đã tồn tại trong danh mục.` },
      });
      return;
    }

    const episode = await prisma.episode.create({
      data: {
        movieId: movie.id,
        episodeNumber: parseInt(episodeNumber as string, 10),
        title,
        description,
        videoUrl,
        introStart: parseFloat(introStart ?? '0'),
        introEnd: parseFloat(introEnd ?? '0'),
        outroStart: parseFloat(outroStart ?? '0'),
        outroEnd: parseFloat(outroEnd ?? '0'),
        thumbnail,
      },
    });

    res.status(201).json({
      success: true,
      data: episode,
    });
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/episodes/:id/watch-history - Pulse Watch History Logger
router.post('/episodes/:id/watch-history', requireAuth, async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { progress, completed } = req.body;

    if (progress === undefined) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Mốc thời gian progress bắt buộc phải có.' },
      });
      return;
    }

    const episode = await prisma.episode.findUnique({ where: { id } });
    if (!episode) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tập phim không tồn tại.' },
      });
      return;
    }

    const history = await prisma.watchHistory.upsert({
      where: {
        unique_user_watch_progress: {
          userId: req.user!.id,
          episodeId: episode.id,
        },
      },
      update: {
        progress: parseFloat(progress as string),
        completed: completed ?? false,
      },
      create: {
        userId: req.user!.id,
        episodeId: episode.id,
        progress: parseFloat(progress as string),
        completed: completed ?? false,
      },
    });

    res.status(200).json({
      success: true,
      data: history,
    });
  } catch (err) {
    next(err);
  }
});

// 7. POST /api/episodes/:id/transcode - Trigger Asynchronous HLS Transcode (Admin Only)
router.post('/episodes/:id/transcode', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { inputFilePath, outputFolder } = req.body;

    if (!inputFilePath || !outputFolder) {
      res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Đường dẫn file gốc và thư mục đầu ra không được để trống.' },
      });
      return;
    }

    const episode = await prisma.episode.findUnique({ where: { id } });
    if (!episode) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tập phim không tồn tại.' },
      });
      return;
    }

    const jobId = `job_${id}_${Date.now()}`;

    // Fire-and-forget transcoding trigger with background handler
    encodingService.transcodeToHLS(jobId, inputFilePath, outputFolder)
      .then(async (result) => {
        // Update database with transcoded link and duration once completed
        await prisma.episode.update({
          where: { id },
          data: {
            videoUrl: result.playlistUrl,
            duration: result.duration,
          }
        });
        console.log(`[Background Worker] Episode ${id} video path updated in database.`);
      })
      .catch((err) => {
        console.error(`[Background Worker Error] Failed to transcode job ${jobId}:`, err.message);
      });

    res.status(202).json({
      success: true,
      data: {
        jobId,
        status: 'QUEUED',
        message: 'Tiến trình transcode video đã được đưa vào hàng đợi xử lý mutex.',
      }
    });
  } catch (err) {
    next(err);
  }
});

// 8. GET /api/transcode/status/:jobId - Poll Transcode Status
router.get('/transcode/status/:jobId', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { jobId } = req.params;
    const progress = encodingService.getJobProgress(jobId);

    res.status(200).json({
      success: true,
      data: {
        jobId,
        progress,
        completed: progress === 100,
      }
    });
  } catch (err) {
    next(err);
  }
});

// 9. GET /api/transcode/sse/:jobId - Stream Transcode Status via SSE (Server-Sent Events)
router.get('/transcode/sse/:jobId', (req: AuthenticatedRequest, res: Response): void => {
  const { jobId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Stream progress increments every 1.5 seconds
  const timer = setInterval(() => {
    const progress = encodingService.getJobProgress(jobId);
    res.write(`data: ${JSON.stringify({ progress, completed: progress === 100 })}\n\n`);

    if (progress === 100) {
      clearInterval(timer);
      res.end();
    }
  }, 1500);

  req.on('close', () => {
    clearInterval(timer);
    res.end();
  });
});

// 10. PUT /api/movies/:id - Update Movie Catalog (Admin Only)
router.put('/movies/:id', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, altTitles, description, studio, releaseYear, posterUrl, bannerUrl, imdbRating } = req.body;

    const movie = await prisma.movie.update({
      where: { id },
      data: {
        title,
        altTitles: altTitles ?? [],
        description,
        studio,
        releaseYear: releaseYear ? parseInt(releaseYear as string, 10) : undefined,
        posterUrl,
        bannerUrl,
        imdbRating: imdbRating ? parseFloat(imdbRating as string) : null,
      },
    });

    res.status(200).json({
      success: true,
      data: movie,
    });
  } catch (err) {
    next(err);
  }
});

// 11. DELETE /api/movies/:id - Delete Movie Catalog (Admin Only)
router.delete('/movies/:id', requireRole([Role.ADMIN]), async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    await prisma.movie.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: 'Đã xóa phim thành công khỏi hệ thống.',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
