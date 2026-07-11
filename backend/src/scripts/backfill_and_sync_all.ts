import { scraperService } from '../services/scraper.service';
import { prisma } from '../db';

const slugs = [
  'hoa-giang-ho-chi-bat-luong-nhan-phan-1',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-2',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-3',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-4',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-5',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-6',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-7',
];

async function run() {
  console.log('🏁 [Manual Sync] Bắt đầu đồng bộ lại các phần phim Họa Giang Hồ Chi Bất Lương Nhân...');
  
  for (const slug of slugs) {
    console.log(`\n🤖 [Manual Sync] Đang đồng bộ: "${slug}"...`);
    const res = await scraperService.syncMovieBySlug(slug);
    
    if (res.success) {
      console.log(`✅ [Manual Sync] Thành công: ${res.message}`);
    } else {
      console.error(`❌ [Manual Sync] Thất bại: ${res.message}`);
    }
  }

  console.log('\n--- VERIFICATION FROM DATABASE ---');
  for (const slug of slugs) {
    const movie = await prisma.movie.findUnique({
      where: { slug },
      include: {
        episodes: {
          include: {
            sources: true
          }
        }
      }
    });

    if (!movie) {
      console.log(`❌ Phim "${slug}" không tồn tại trong DB.`);
      continue;
    }

    console.log(`🎥 Phim: "${movie.title}" (${slug})`);
    console.log(`   - Số tập hiện tại trong DB: ${movie.episodes?.length}`);
    const serverCounts: Record<string, number> = {};
    movie.episodes?.forEach(ep => {
      ep.sources.forEach(src => {
        serverCounts[src.serverName] = (serverCounts[src.serverName] || 0) + 1;
      });
    });
    console.log('   - Danh sách server nguồn:');
    Object.entries(serverCounts).forEach(([name, count]) => {
      console.log(`     └─ Server: "${name}" (${count} tập)`);
    });
  }

  console.log('\n🏁 [Manual Sync] Hoàn thành quy trình đồng bộ thủ công!');
}

run()
  .catch(err => {
    console.error('❌ Lỗi không xác định:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
