import 'dotenv/config';
import { prisma } from '../db';

async function run() {
  console.log('🔍 [Database Inspector] Đang kết nối Cơ sở dữ liệu để rà soát toàn diện...');

  const movies = await prisma.movie.findMany({
    include: {
      series: true,
      _count: {
        select: { episodes: true }
      }
    },
    orderBy: {
      title: 'asc'
    }
  });

  console.log(`📊 Tổng số phim tìm thấy: ${movies.length}\n`);

  console.log('📋 DANH SÁCH TOÀN BỘ PHIM TRONG DB:');
  console.log('='.repeat(100));
  
  let liveActionCount = 0;

  movies.forEach((m, index) => {
    const titleLower = m.title.toLowerCase();
    const altTitlesLower = JSON.stringify(m.altTitles).toLowerCase();
    const descriptionLower = (m.description || '').toLowerCase();

    let isLiveAction = false;

    // 1. Kiểm tra Đấu Phá Thương Khung S2 Live-Action (34 tập, 2023)
    if (titleLower.includes('đấu phá thương khung') && (
      altTitlesLower.includes('fights break sphere season') || 
      altTitlesLower.includes('battle through the heaven season') || 
      m.id === '304fab93-4c9f-4d54-9a92-a5662c7bed8c' || 
      (m.releaseYear === 2023 && m._count.episodes === 34)
    )) {
      isLiveAction = true;
    }

    // 2. Kiểm tra Đấu Phá Thương Khung S1 Live-Action (2018 - Ngô Lỗi)
    else if (titleLower === 'đấu phá thương khung' && (
      m.releaseYear === 2018 || 
      (altTitlesLower.includes('battle through the heaven') && !altTitlesLower.includes('fights break sphere'))
    )) {
      isLiveAction = true;
    }

    // 3. Kiểm tra Đấu Phá Thương Khung: Thức Tỉnh (Bản điện ảnh Web 2023)
    else if (titleLower.includes('thức tỉnh') && titleLower.includes('đấu phá')) {
      isLiveAction = true;
    }

    // 4. Kiểm tra Tử Xuyên S2 Live-Action (40 tập, ID đặc thù)
    else if (titleLower.includes('tử xuyên') && (
      altTitlesLower.includes('eternal brotherhood') || 
      m.id === '5a6b9fde-eb64-48c8-b044-cc52f933fdeb'
    )) {
      isLiveAction = true;
    }

    // 5. Kiểm tra các phim thuộc danh sách từ khóa Live-Action chung
    else {
      const LIVE_ACTION_PATTERNS = [
        'thanh vân chí',       // Tru Tiên người đóng
        'my heroic husband',   // Ở Rể người đóng
        'ở rể',                // Ở Rể
        'ever night',          // Tương Dạ người đóng
        'tương dạ',            // Tương Dạ người đóng
        'ma thổi đèn',         // Ma Thổi Đèn người đóng
        'candle in the tomb',  // Ma Thổi Đèn người đóng
        'mojin',               // Ma Thổi Đèn movie người đóng
        'the blood of youth',  // Thiếu Niên Ca Hành người đóng
        'snow eagle lord',     // Tuyết Ưng Lĩnh Chủ người đóng
        'nhiên hồn chiến',     // Đấu La Đại Lục người đóng
        'đấu la đại lục: nhiên hồn chiến',
        'the land of warriors' // Đấu La Đại Lục người đóng
      ];

      for (const pattern of LIVE_ACTION_PATTERNS) {
        if (titleLower.includes(pattern) || altTitlesLower.includes(pattern)) {
          // Ngoại lệ bảo vệ hoạt hình đặc thù
          if (pattern === 'ở rể' && titleLower.includes('vú em tiên tôn')) continue;
          if (pattern === 'ở rể' && (titleLower.includes('hoạt hình') || altTitlesLower.includes('donghua') || altTitlesLower.includes('animation'))) continue;
          
          isLiveAction = true;
          break;
        }
      }
    }

    // 6. Kiểm tra Tru Tiên Live-Action (Bản điện ảnh Tiêu Chiến)
    if (!isLiveAction && titleLower === 'tru tiên') {
      if (descriptionLower.includes('tiêu chiến') || descriptionLower.includes('lý thấm') || descriptionLower.includes('mạnh mỹ kỳ')) {
        isLiveAction = true;
      }
    }

    if (isLiveAction) {
      liveActionCount++;
    }

    const typeLabel = isLiveAction ? '❌ [LIVE-ACTION]' : '✅ [DONGHUA 3D]';
    const seriesInfo = m.series ? `${m.series.name} (${m.seriesLabel || 'Không nhãn'})` : 'Không thuộc sê-ri';

    console.log(`${(index + 1).toString().padStart(3, '0')}. Title: "${m.title}"`);
    console.log(`     ID:          ${m.id}`);
    console.log(`     AltTitles:   ${JSON.stringify(m.altTitles)}`);
    console.log(`     Năm/Tập:     Năm ${m.releaseYear} | Số tập: ${m._count.episodes} tập`);
    console.log(`     Sê-ri:       ${seriesInfo}`);
    console.log(`     Phân loại:   ${typeLabel}`);
    console.log('-'.repeat(100));
  });

  console.log(`\n========================================================================`);
  console.log(`📊 TỔNG KẾT RÀ SOÁT:`);
  console.log(`   - Tổng số phim trong hệ thống: ${movies.length}`);
  console.log(`   - Số phim nghi ngờ hoặc chắc chắn là Live-Action: ${liveActionCount}`);
  console.log(`========================================================================\n`);
}

run()
  .catch(err => {
    console.error('❌ Lỗi rà soát DB:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
