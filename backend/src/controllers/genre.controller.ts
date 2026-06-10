import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../db';

const router = Router();

// Lấy danh sách tất cả thể loại (có đếm số lượng phim)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const genres = await prisma.genre.findMany({
      include: {
        _count: {
          select: { movies: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.status(200).json({
      success: true,
      data: genres,
    });
  } catch (err) {
    next(err);
  }
});

// Lấy chi tiết thể loại và danh sách phim theo slug
router.get('/:slug', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    
    const genre = await prisma.genre.findUnique({
      where: { slug }
    });

    if (!genre) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Thể loại không tồn tại' } });
    }

    const movieGenres = await prisma.movieGenre.findMany({
      where: { genreId: genre.id },
      include: {
        movie: {
          include: {
            leaderboard: true
          }
        }
      }
    });

    const movies = movieGenres.map(mg => mg.movie);

    res.status(200).json({
      success: true,
      data: {
        genre,
        movies
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
