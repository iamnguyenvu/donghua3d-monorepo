import 'dotenv/config';
import { prisma } from '../db';

async function run() {
  console.log('🧹 [Purge] Bắt đầu rà soát và loại bỏ phim người đóng (Live-Action)...');

  // Danh sách các từ khóa hoặc tên chính xác của các bản người đóng cần loại bỏ
  const LIVE_ACTION_PATTERNS = [
    'thanh vân chí',       // Tru Tiên người đóng (Legend Of Chusen)
    'thức tỉnh',           // Đấu Phá Thương Khung movie người đóng 2023
    'eternal brotherhood', // Tử Xuyên người đóng
    'quang minh tam kiệt', // Tử Xuyên người đóng
    'my heroic husband',   // Ở Rể người đóng
    'ở rể',                // Ở Rể (không có bản hoạt hình 3D trên OPhim)
    'ever night',          // Tương Dạ người đóng
    'tương dạ',            // Tương Dạ người đóng
    'ma thổi đèn',         // Ma Thổi Đèn người đóng
    'candle in the tomb',  // Ma Thổi Đèn người đóng
    'mojin',               // Ma Thổi Đèn movie người đóng
    'đấu phá thương khung 2', // Bản truyền hình người đóng S2
    'fights break sphere 2',
    'the blood of youth',  // Thiếu Niên Ca Hành người đóng
    'snow eagle lord',     // Tuyết Ưng Lĩnh Chủ người đóng
    'nhiên hồn chiến',     // Đấu La Đại Lục người đóng (starring Zhou Yiran)
    'đấu la đại lục: nhiên hồn chiến',
    'the land of warriors' // Đấu La Đại Lục người đóng
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

    let isLiveAction = false;

    // 1. Kiểm tra theo các patterns định sẵn
    for (const pattern of LIVE_ACTION_PATTERNS) {
      if (titleLower.includes(pattern) || altTitlesLower.includes(pattern)) {
        // Ngoại lệ bảo vệ hoạt hình đặc thù
        if (pattern === 'ở rể' && titleLower.includes('vú em tiên tôn')) continue;
        if (pattern === 'tử xuyên' && (altTitlesLower.includes('purple river') || descriptionLower.includes('purple river'))) continue;
        if (pattern === 'ở rể' && (titleLower.includes('hoạt hình') || altTitlesLower.includes('donghua') || altTitlesLower.includes('animation'))) continue;
        
        isLiveAction = true;
        break;
      }
    }

    // 2. Kiểm tra Đấu Phá Thương Khung Live-Action (bản 2018, slug: dau-pha-thuong-khung, 45 tập)
    if (!isLiveAction && titleLower === 'đấu phá thương khung') {
      if (altTitlesLower.includes('battle through the heaven') && !altTitlesLower.includes('fights break sphere')) {
        isLiveAction = true;
      }
    }

    // 3. Kiểm tra Tuyết Ưng Lĩnh Chủ Live-Action (bản 2022-2023, 40 tập, slug: tuyet-ung-linh-chu-2022)
    if (!isLiveAction && titleLower === 'tuyết ưng lĩnh chủ') {
      if (altTitlesLower.includes('snow eagle lord')) {
        isLiveAction = true;
      }
    }

    // 4. Kiểm tra Thiếu Niên Ca Hành Live-Action (The Blood of Youth, 40 tập, slug: thieu-nien-ca-hanh-2022)
    if (!isLiveAction && titleLower === 'thiếu niên ca hành') {
      if (altTitlesLower.includes('the blood of youth')) {
        isLiveAction = true;
      }
    }

    // 5. Kiểm tra Tru Tiên Live-Action (bản điện ảnh 2019 của Tiêu Chiến)
    if (!isLiveAction && titleLower === 'tru tiên') {
      if (descriptionLower.includes('tiêu chiến') || descriptionLower.includes('lý thấm') || descriptionLower.includes('mạnh mỹ kỳ')) {
        isLiveAction = true;
      }
    }

    // 6. Kiểm tra Già Thiên: Vùng Cấm / Già Thiên: Khu Vực Cấm (Forbidden Zone) - phim người đóng
    if (!isLiveAction && (titleLower.includes('vùng cấm') || titleLower.includes('khu vực cấm')) && titleLower.includes('già thiên')) {
      isLiveAction = true;
    }

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
