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

  // Tiêu chuẩn live-action để cảnh báo trong bảng kiểm tra
  const LIVE_ACTION_PATTERNS = [
    'thanh vân chí',
    'thức tỉnh',
    'eternal brotherhood',
    'quang minh tam kiệt',
    'my heroic husband',
    'ở rể',
    'ever night',
    'tương dạ',
    'ma thổi đèn',
    'candle in the tomb',
    'mojin',
    'đấu phá thương khung 2',
    'fights break sphere 2',
    'the blood of youth',
    'snow eagle lord',
    'nhiên hồn chiến',
    'the land of warriors'
  ];

  console.log('📋 DANH SÁCH TOÀN BỘ PHIM TRONG DB:');
  console.log('='.repeat(100));
  
  let liveActionCount = 0;

  movies.forEach((m, index) => {
    const titleLower = m.title.toLowerCase();
    const altTitlesLower = JSON.stringify(m.altTitles).toLowerCase();
    const descriptionLower = (m.description || '').toLowerCase();

    let isLiveAction = false;
    for (const pattern of LIVE_ACTION_PATTERNS) {
      if (titleLower.includes(pattern) || altTitlesLower.includes(pattern)) {
        if (pattern === 'ở rể' && titleLower.includes('vú em tiên tôn')) continue;
        if (pattern === 'tử xuyên' && (altTitlesLower.includes('purple river') || descriptionLower.includes('purple river'))) continue;
        if (pattern === 'ở rể' && (titleLower.includes('hoạt hình') || altTitlesLower.includes('donghua') || altTitlesLower.includes('animation'))) continue;
        isLiveAction = true;
        break;
      }
    }

    // Check ĐPTK live action 2018
    if (!isLiveAction && titleLower === 'đấu phá thương khung') {
      if (altTitlesLower.includes('battle through the heaven') && !altTitlesLower.includes('fights break sphere')) {
        isLiveAction = true;
      }
    }

    // Check Tuyết Ưng Lĩnh Chủ Live-Action
    if (!isLiveAction && titleLower === 'tuyết ưng lĩnh chủ' && altTitlesLower.includes('snow eagle lord')) {
      isLiveAction = true;
    }

    // Check Thiếu Niên Ca Hành Live-Action
    if (!isLiveAction && titleLower === 'thiếu niên ca hành' && altTitlesLower.includes('the blood of youth')) {
      isLiveAction = true;
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
