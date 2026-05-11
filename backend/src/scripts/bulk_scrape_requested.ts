import 'dotenv/config';
import { prisma } from '../db';
import { scraperService } from '../services/scraper.service';

interface ScrapeItem {
  slug: string;
  label: string;
}

interface SeriesGroup {
  seriesName: string;
  items: ScrapeItem[];
}

// 20 nhóm sê-ri mới hoạt hình 3D chính tông theo đúng yêu cầu bổ sung của người dùng
const SERIES_GROUPS: SeriesGroup[] = [
  {
    seriesName: 'Vũ Trụ Kiếm Lai',
    items: [
      { slug: 'kiem-lai', label: 'Phần 1' },
      { slug: 'kiem-lai-phan-2', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Còn Ra Thể Thống Gì Nữa',
    items: [
      { slug: 'con-ra-the-thong-gi-nua', label: 'Phần 1' },
      { slug: 'con-ra-the-thong-gi-nua-phan-2', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Tử Xuyên',
    items: [
      // { slug: 'tu-xuyen', label: 'Phần 1' }, // Đã bị OPhim gỡ khỏi hệ thống
      { slug: 'tu-xuyen-phan-2-2025', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Thâm Không Bỉ Ngạn',
    items: [
      { slug: 'tham-khong-bi-ngan', label: 'Phần 1' }
    ]
  },
  {
    seriesName: 'Trảm Thần',
    items: [
      { slug: 'tram-than-pham-tran-than-vuc', label: 'Phần 1' }
    ]
  },
  {
    seriesName: 'Nghịch Thiên Tà Thần',
    items: [
      { slug: 'nghich-thien-ta-than', label: 'Phần 1' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Thần Mộ',
    items: [
      { slug: 'than-mo-phan-1', label: 'Phần 1' },
      { slug: 'than-mo-phan-2', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Đạo Yêu Hành',
    items: [
      { slug: 'tap-yeu-luc-phan-khoi-hanh', label: 'Khởi Hành' }
    ]
  },
  {
    seriesName: 'Huyền Giới Chi Môn',
    items: [
      { slug: 'huyen-gioi-chi-mon', label: 'Phần 1' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Già Thiên',
    items: [
      { slug: 'gia-thien', label: 'Bản TV' },
      { slug: 'gia-thien-movie-vac-quan-tai-chien-vuong-dang', label: 'Movie' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Bách Luyện Thành Thần',
    items: [
      { slug: 'bach-luyen-thanh-than', label: 'Phần 1' },
      { slug: 'bach-luyen-thanh-than-phan-2', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Tu La Võ Thần',
    items: [
      { slug: 'tu-la-vo-than-phan-2', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Quân Hữu Vân',
    items: [
      { slug: 'quan-huu-van', label: 'Phần 1' },
      { slug: 'jun-you-yun-2nd-season', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Đại Đường Thừa Phong Lục',
    items: [
      { slug: 'dai-duong-thua-phong-luc', label: 'Phần 1' }
    ]
  },
  {
    seriesName: 'Ta Là Đao Tông',
    items: [
      { slug: 'ta-la-dao-tong', label: 'Phần 1' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Tru Tiên',
    items: [
      { slug: 'tru-tien-2021', label: 'Phần 1' },
      { slug: 'tru-tien-phan-2', label: 'Phần 2' },
      { slug: 'tru-tien-phan-3', label: 'Phần 3' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Linh Lung (Ling Cage)',
    items: [
      { slug: 'linh-lung-hoat-hinh', label: 'Phần 1' },
      { slug: 'ling-cage-season-2', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Nhất Niệm Vĩnh Hằng',
    items: [
      { slug: 'nhat-niem-vinh-hang-2020', label: 'Phần 1' },
      { slug: 'nhat-niem-vinh-hang', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Hỏa Phụng Liêu Nguyên',
    items: [
      { slug: 'hoa-phung-lieu-nguyen', label: 'Phần 1' }
    ]
  },
  {
    seriesName: 'Tiên Nghịch',
    items: [
      { slug: 'tien-nghich', label: 'Phần 1' }
    ]
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 [VPS Requested Scraper] Khởi động quy trình cào phim bổ sung theo yêu cầu...\n');

  let totalSynced = 0;
  let totalErrors = 0;

  for (const group of SERIES_GROUPS) {
    console.log(`========================================================================`);
    console.log(`🎬 ĐANG XỬ LÝ SÊ-RI: "${group.seriesName}"`);
    console.log(`========================================================================`);

    // 1. Kiểm tra hoặc tạo mới nhóm MovieSeries
    let series = await prisma.movieSeries.findFirst({
      where: { name: group.seriesName }
    });

    if (!series) {
      console.log(`📌 Tạo mới MovieSeries: "${group.seriesName}"...`);
      series = await prisma.movieSeries.create({
        data: { name: group.seriesName }
      });
    } else {
      console.log(`✅ Đã tìm thấy MovieSeries hiện tại (ID: ${series.id})`);
    }

    // 2. Cào từng phim trong sê-ri và gắn liên kết
    for (const item of group.items) {
      console.log(`\n🤖 [Scrape] Bắt đầu đồng bộ phim slug: "${item.slug}" (Nhãn: ${item.label})...`);
      
      const syncResult = await scraperService.syncMovieBySlug(item.slug);

      if (syncResult.success && syncResult.movie) {
        const movie = syncResult.movie;
        console.log(`   ✔️ Đồng bộ thành công: "${movie.title}"`);

        // Cập nhật liên kết Series và Label cho phim
        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            seriesId: series.id,
            seriesLabel: item.label
          }
        });
        console.log(`   🔗 Đã gán phim vào Sê-ri: "${group.seriesName}" - Nhãn: "${item.label}"`);
        totalSynced++;
      } else {
        console.error(`   ❌ Thất bại khi cào phim slug "${item.slug}": ${syncResult.message}`);
        totalErrors++;
      }

      // Giãn cách 2 giây giữa các lần gọi API OPhim để tránh quá tải
      console.log('   ⏱️ Đợi 2 giây để tiếp tục tác vụ tiếp theo...');
      await delay(2000);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🎉 HOÀN THÀNH QUY TRÌNH BULK SCRAPE CÁC PHIM YÊU CẦU!`);
  console.log(`📊 BÁO CÁO TỔNG QUAN:`);
  console.log(`   - Số phim đồng bộ & liên kết thành công: ${totalSynced}`);
  console.log(`   - Số phim cào thất bại/lỗi: ${totalErrors}`);
  console.log(`========================================================================\n`);
}

run()
  .catch(err => {
    console.error('❌ Lỗi nghiêm trọng khi thực thi script:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
