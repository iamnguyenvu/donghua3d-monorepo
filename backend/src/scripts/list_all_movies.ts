import 'dotenv/config';
import { prisma } from '../db';

async function run() {
  console.log('🤖 Bắt đầu rà soát toàn bộ phim trong cơ sở dữ liệu...');
  const movies = await prisma.movie.findMany({
    include: {
      _count: {
        select: { episodes: true }
      }
    },
    orderBy: {
      title: 'asc'
    }
  });

  console.log(`📊 Tổng số phim tìm thấy: ${movies.length}\n`);
  for (const movie of movies) {
    console.log(`- Title: "${movie.title}"`);
    console.log(`  ID: ${movie.id}`);
    console.log(`  Alt Titles: ${JSON.stringify(movie.altTitles)}`);
    console.log(`  Release Year: ${movie.releaseYear}`);
    console.log(`  Episodes Count: ${movie._count.episodes}`);
    console.log(`  Series ID: ${movie.seriesId || 'Không có'}`);
    console.log(`  Series Label: ${movie.seriesLabel || 'Không có'}`);
    console.log(`  Studio: ${movie.studio || 'Không có'}`);
    console.log('----------------------------------------------------');
  }
}

run()
  .catch(err => console.error('❌ Lỗi:', err))
  .finally(async () => {
    await prisma.$disconnect();
  });
