import 'dotenv/config';
import { prisma } from '../db';

async function run() {
  console.log('🧹 [Purge] Bắt đầu rà soát và loại bỏ phim người đóng (Live-Action)...');

  // Danh sách các từ khóa hoặc tên chính xác của các bản người đóng cần loại bỏ
  const LIVE_ACTION_PATTERNS = [
    'thanh vân chí',       // Tru Tiên người đóng
    'thức tỉnh',           // Đấu Phá Thương Khung movie người đóng 2023
    'eternal brotherhood', // Tử Xuyên người đóng
    'quang minh tam kiệt', // Tử Xuyên người đóng
    'my heroic husband',   // Ở Rể người đóng
    'ở rể',                // Ở Rể (không có bản hoạt hình 3D trên OPhim)
    'ever night',          // Tương Dạ người đóng
    'tương dạ',            // Tương Dạ người đóng
    'ma thổi đèn',         // Ma Thổi Đèn người đóng (chỉ có bản người đóng)
    'candle in the tomb',  // Ma Thổi Đèn người đóng
    'mojin',               // Ma Thổi Đèn movie người đóng
    'đấu phá thương khung 2', // Bản truyền hình người đóng S2 (không phải Đấu Phá Thương Khung (Phần 2))
    'fights break sphere 2'
  ];

  // Lấy danh sách toàn bộ phim trong Database
  const movies = await prisma.movie.findMany({
    include: {
      _count: {
        select: { episodes: true }
      }
    }
  });

  console.log(`🔍 Hiện đang có ${movies.length} phim trong Database.`);

  let deletedCount = 0;

  for (const m of movies) {
    const titleLower = m.title.toLowerCase();
    const altTitlesLower = JSON.stringify(m.altTitles).toLowerCase();
    const descriptionLower = (m.description || '').toLowerCase();

    // Kiểm tra xem phim có thuộc diện live-action dựa trên tiêu đề, altTitles hoặc mô tả hay không
    const isLiveAction = LIVE_ACTION_PATTERNS.some(pattern => {
      // Ngoại lệ: Không xóa bản hoạt hình Tử Xuyên (Purple River) hoặc Đấu Phá Thương Khung (Fights Break Sphere)
      if (pattern === 'ở rể' && titleLower.includes('vú em tiên tôn')) {
        return false; // Đây là hoạt hình ngắn, giữ lại
      }
      if (pattern === 'tử xuyên' && (altTitlesLower.includes('purple river') || descriptionLower.includes('purple river'))) {
        return false; // Đây là hoạt hình Tử Xuyên chính tông, giữ lại
      }
      if (pattern === 'ở rể' && (titleLower.includes('hoạt hình') || altTitlesLower.includes('donghua') || altTitlesLower.includes('animation'))) {
        return false; // Giữ lại nếu là bản hoạt hình
      }

      return titleLower.includes(pattern) || altTitlesLower.includes(pattern);
    });

    if (isLiveAction) {
      console.log(`   ❌ [Loại bỏ] Phát hiện phim người đóng: "${m.title}" | AltTitles: ${JSON.stringify(m.altTitles)} (${m._count.episodes} tập)`);
      
      // Cascade delete: ratings, comments, episodes của phim này sẽ tự động xóa
      await prisma.movie.delete({
        where: { id: m.id }
      });
      deletedCount++;
    }
  }

  // Dọn dẹp các MovieSeries rác không còn chứa phim nào
  const seriesList = await prisma.movieSeries.findMany({
    include: {
      _count: {
        select: { movies: true }
      }
    }
  });

  let deletedSeriesCount = 0;
  for (const s of seriesList) {
    if (s._count.movies === 0) {
      console.log(`   🗑️  [Xóa Sê-ri trống] Sê-ri không còn phim nào: "${s.name}"`);
      await prisma.movieSeries.delete({
        where: { id: s.id }
      });
      deletedSeriesCount++;
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🧹 HOÀN TẤT LOẠI BỎ LIVE-ACTION!`);
  console.log(`   - Tổng số phim người đóng đã bị xóa sạch: ${deletedCount}`);
  console.log(`   - Tổng số Sê-ri phim trống đã dọn dẹp: ${deletedSeriesCount}`);
  console.log(`========================================================================\n`);
}

run()
  .catch(err => {
    console.error('❌ Lỗi dọn dẹp Live-Action:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
