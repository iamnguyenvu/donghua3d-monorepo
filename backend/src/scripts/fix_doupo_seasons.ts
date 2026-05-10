import 'dotenv/config';
import { prisma } from '../db';
import { scraperService } from '../services/scraper.service';

async function run() {
  console.log('🤖 [Fix Doupo] Bắt đầu sửa lỗi cào nhầm bản Đấu Phá Thương Khung Phần 2 người đóng...');

  // 1. Tìm bản ghi sai theo tiêu đề
  const incorrectMovie = await prisma.movie.findFirst({
    where: {
      OR: [
        { title: 'Đấu Phá Thương Khung (Phần 2)' },
        { title: 'Đấu Phá Thương Khung Phần 2' }
      ]
    }
  });

  if (incorrectMovie) {
    console.log(`⚠️ Tìm thấy phim cào nhầm: "${incorrectMovie.title}" (ID: ${incorrectMovie.id}). Tiến hành xóa...`);

    // Xóa tất cả các bảng liên kết có khóa ngoại tới Movie để tránh lỗi Foreign Key Constraint
    const deletedEpisodes = await prisma.episode.deleteMany({
      where: { movieId: incorrectMovie.id }
    });
    console.log(`   - Đã xóa ${deletedEpisodes.count} tập phim liên kết.`);

    const deletedRatings = await prisma.rating.deleteMany({
      where: { movieId: incorrectMovie.id }
    });
    console.log(`   - Đã xóa ${deletedRatings.count} đánh giá liên kết.`);

    const deletedComments = await prisma.comment.deleteMany({
      where: { movieId: incorrectMovie.id }
    });
    console.log(`   - Đã xóa ${deletedComments.count} bình luận liên kết.`);

    const deletedWatchlists = await prisma.watchlist.deleteMany({
      where: { movieId: incorrectMovie.id }
    });
    console.log(`   - Đã xóa ${deletedWatchlists.count} mục danh sách phát liên kết.`);

    // Xóa bảng xếp hạng toàn cầu
    await prisma.globalTierLeaderboard.deleteMany({
      where: { movieId: incorrectMovie.id }
    });
    console.log(`   - Đã xóa bảng xếp hạng tier toàn cầu.`);

    // Xóa chính thực thể phim
    await prisma.movie.delete({
      where: { id: incorrectMovie.id }
    });
    console.log(`✅ Đã xóa hoàn toàn phim cào nhầm "${incorrectMovie.title}" ra khỏi cơ sở dữ liệu.`);
  } else {
    console.log('💡 Không tìm thấy phim có tiêu đề "Đấu Phá Thương Khung (Phần 2)" trong cơ sở dữ liệu.');
  }

  // 2. Tìm hoặc tạo MovieSeries "Vũ Trụ Đấu Phá Thương Khung"
  let series = await prisma.movieSeries.findFirst({
    where: { name: 'Vũ Trụ Đấu Phá Thương Khung' }
  });

  if (!series) {
    series = await prisma.movieSeries.create({
      data: { name: 'Vũ Trụ Đấu Phá Thương Khung' }
    });
    console.log(`📌 Tạo mới MovieSeries: "Vũ Trụ Đấu Phá Thương Khung"`);
  }

  // 3. Tiến hành cào bản hoạt hình 3D chuẩn (slug: dau-pha-thuong-khung-2)
  console.log('\n🤖 [Scrape] Bắt đầu đồng bộ bản hoạt hình 3D Đấu Phá Thương Khung Phần 2 (slug: dau-pha-thuong-khung-2)...');
  const syncResult = await scraperService.syncMovieBySlug('dau-pha-thuong-khung-2');

  if (syncResult.success && syncResult.movie) {
    const movie = syncResult.movie;
    console.log(`   ✔️ Đồng bộ thành công bản hoạt hình: "${movie.title}"`);

    // Gán vào series
    await prisma.movie.update({
      where: { id: movie.id },
      data: {
        seriesId: series.id,
        seriesLabel: 'Phần 2'
      }
    });
    console.log(`   🔗 Đã liên kết phim vào sê-ri: "Vũ Trụ Đấu Phá Thương Khung" - Nhãn: "Phần 2"`);
  } else {
    console.error(`   ❌ Thất bại khi cào bản hoạt hình Đấu Phá Thương Khung 2: ${syncResult.message}`);
  }

  console.log('\n✨ Đã hoàn tất sửa lỗi Đấu Phá Thương Khung Phần 2.');
}

run()
  .catch(err => {
    console.error('❌ Lỗi:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
