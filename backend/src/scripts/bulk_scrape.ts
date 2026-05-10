import 'dotenv/config';
import { prisma } from '../db';
import { scraperService } from '../services/scraper.service';

// Định nghĩa kiểu dữ liệu cho từng bộ phim trong nhóm
interface ScrapeItem {
  slug: string;
  label: string;
}

// Định nghĩa cấu trúc nhóm sê-ri
interface SeriesGroup {
  seriesName: string;
  items: ScrapeItem[];
}

// 4 Nhóm vũ trụ phim lớn cần cào bổ sung và liên kết
const SERIES_GROUPS: SeriesGroup[] = [
  {
    seriesName: 'Vũ Trụ Đấu Phá Thương Khung',
    items: [
      { slug: 'dau-pha-thuong-khung', label: 'Phần 1' },
      { slug: 'dau-pha-thuong-khung-phan-2', label: 'Phần 2' },
      { slug: 'dau-pha-thuong-khung-3', label: 'Phần 3' },
      { slug: 'dau-pha-thuong-khung-4', label: 'Phần 4' },
      { slug: 'dau-pha-thuong-khung-ova-4-duyen-khoi', label: 'Duyên Khởi' },
      { slug: 'dau-pha-thuong-khung-ngoai-truyen', label: 'Hẹn Ước 3 Năm' },
      { slug: 'dau-pha-thuong-khung-5', label: 'Phần 5' },
      { slug: 'dau-pha-thuong-khung-thuc-tinh', label: 'Movie' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Đấu La Đại Lục',
    items: [
      { slug: 'dau-la-dai-luc', label: 'Phần 1' },
      { slug: 'dau-la-dai-luc-2-tuyet-the-duong-mon', label: 'Phần 2' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Thiếu Niên Ca Hành',
    items: [
      { slug: 'thieu-nien-ca-hanh', label: 'Phần 1' },
      { slug: 'thieu-nien-ca-hanh-phan-2', label: 'Phần 2' },
      { slug: 'thieu-nien-ca-hanh-phan-3', label: 'Phần 3' },
      { slug: 'youths-and-golden-coffin-4', label: 'Phần 4' }
    ]
  },
  {
    seriesName: 'Vũ Trụ Bất Lương Nhân',
    items: [
      { slug: 'hoa-giang-ho-chi-bat-luong-nhan-phan-1', label: 'Phần 1' },
      { slug: 'hoa-giang-ho-chi-bat-luong-nhan-phan-2', label: 'Phần 2' },
      { slug: 'hoa-giang-ho-chi-bat-luong-nhan-phan-3', label: 'Phần 3' },
      { slug: 'hoa-giang-ho-chi-bat-luong-nhan-phan-4', label: 'Phần 4' },
      { slug: 'hoa-giang-ho-chi-bat-luong-nhan-phan-5', label: 'Phần 5' },
      { slug: 'hoa-giang-ho-chi-bat-luong-nhan-phan-6', label: 'Phần 6' },
      { slug: 'hoa-giang-ho-chi-bat-luong-nhan-phan-7', label: 'Phần 7' }
    ]
  }
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('🚀 [VPS Bulk Scraper] Khởi động quy trình cào phim hàng loạt & liên kết sê-ri...\n');

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

      // Giãn cách 3 giây giữa các lần gọi API OPhim để tránh quá tải hoặc bị chặn IP
      console.log('   ⏱️ Đợi 3 giây để tiếp tục tác vụ tiếp theo...');
      await delay(3000);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🎉 HOÀN THÀNH QUY TRÌNH BULK SCRAPE TRÊN VPS!`);
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
