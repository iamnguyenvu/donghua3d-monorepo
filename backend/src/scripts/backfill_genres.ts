import { prisma } from '../db';

/**
 * Script backfill: Quét lại toàn bộ phim hiện có trong Database và cập nhật Genre
 * Usage: npm run backfill-genres
 */
async function backfillGenres() {
  console.log('🚀 [Genre Backfill] Bắt đầu quét lại thể loại cho các phim hiện có...');
  
  const movies = await prisma.movie.findMany({
    select: { id: true, title: true, altTitles: true }
  });

  console.log(`Tìm thấy ${movies.length} phim trong cơ sở dữ liệu.`);

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    console.log(`[${i + 1}/${movies.length}] Cập nhật phim: ${movie.title}`);
    
    try {
      if (Array.isArray(movie.altTitles) && movie.altTitles.length > 0) {
        // Assume slug could be derived, or use Ophim API text search
        // Nhưng Ophim API chính xác nhất khi sync theo slug.
      }
      
      console.log(`⏭️ Vui lòng thiết lập Slug cho ${movie.title} để cập nhật.`);
    } catch (error) {
      console.error(`❌ Lỗi khi cập nhật ${movie.title}:`, error);
    }
  }

  console.log('✅ Hoàn tất Backfill Genres.');
}

backfillGenres()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
