import 'dotenv/config';
import { prisma } from '../db';
import { scraperService } from '../services/scraper.service';

// Danh sách các phim cốt lõi cần quét cập nhật trực tiếp
const CORE_TRACKED_SLUGS = [
  // Đấu Phá Thương Khung
  'dau-pha-thuong-khung-2',
  'dau-pha-thuong-khung-3',
  'dau-pha-thuong-khung-4',
  'dau-pha-thuong-khung-ova-4-duyen-khoi',
  'dau-pha-thuong-khung-ngoai-truyen',
  'dau-pha-thuong-khung-5',

  // Đấu La Đại Lục
  'dau-la-dai-luc',
  'dau-la-dai-luc-2-tuyet-the-duong-mon',

  // Thiếu Niên Ca Hành
  'thieu-nien-ca-hanh',
  'thieu-nien-ca-hanh-phan-2',
  'thieu-nien-ca-hanh-phan-3',
  'youths-and-golden-coffin-4',

  // Bất Lương Nhân
  'hoa-giang-ho-chi-bat-luong-nhan-phan-1',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-2',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-3',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-4',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-5',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-6',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-7',

  // Phim yêu cầu bổ sung hoạt hình 3D chính tông
  'kiem-lai',
  'kiem-lai-phan-2',
  'con-ra-the-thong-gi-nua',
  'con-ra-the-thong-gi-nua-phan-2',
  'tu-xuyen-phan-2-2025',
  'tham-khong-bi-ngan',
  'tram-than-pham-tran-than-vuc',
  'nghich-thien-ta-than',
  'than-mo-phan-1',
  'than-mo-phan-2',
  'tap-yeu-luc-phan-khoi-hanh',
  'huyen-gioi-chi-mon',
  'gia-thien',
  'gia-thien-movie-vac-quan-tai-chien-vuong-dang',
  'bach-luyen-thanh-than',
  'bach-luyen-thanh-than-phan-2',
  'tu-la-vo-than-phan-2',
  'quan-huu-van',
  'jun-you-yun-2nd-season',
  'dai-duong-thua-phong-luc',
  'ta-la-dao-tong',
  'tru-tien-2021',
  'tru-tien-phan-2',
  'tru-tien-phan-3',
  'linh-lung-hoat-hinh',
  'ling-cage-season-2',
  'nhat-niem-vinh-hang-2020',
  'nhat-niem-vinh-hang',
  'hoa-phung-lieu-nguyen',
  'tien-nghich',
  'dai-dao-trieu-thien'
];

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  console.log('⏰ [Auto-Updater] Khởi tạo quy trình tự động cập nhật tập phim mới nhất...');
  
  // 1. Ghi nhận log bắt đầu vào Database
  const logRecord = await prisma.scrapingLog.create({
    data: {
      status: 'PENDING',
      syncedCount: 0,
      results: []
    }
  });

  const results: string[] = [];
  let totalSynced = 0;

  try {
    // PHẦN A: Đồng bộ các trang phim mới cập nhật gần đây (Phủ sóng toàn diện phim hoạt hình)
    console.log('\n🌟 PHẦN A: Quét các trang phim mới cập nhật gần đây (Trang 1 -> 3)...');
    for (let page = 1; page <= 3; page++) {
      console.log(`🤖 Đang quét danh sách phim mới cập nhật trang ${page}...`);
      const pageResult = await scraperService.syncLatestHoathinh(page, true);
      
      if (pageResult.success) {
        totalSynced += pageResult.syncedCount;
        results.push(...pageResult.results);
        console.log(`   ✔️ Hoàn tất trang ${page}. Đồng bộ: ${pageResult.syncedCount} phim.`);
      } else {
        console.error(`   ❌ Lỗi khi đồng bộ trang ${page}`);
      }
      await delay(2000); // Giãn cách 2 giây tránh nghẽn mạng
    }

    // PHẦN B: Đồng bộ trực tiếp danh sách phim cốt lõi (Bảo đảm không bỏ sót)
    console.log('\n🌟 PHẦN B: Quét và cập nhật trực tiếp các phim cốt lõi được theo dõi...');
    for (const slug of CORE_TRACKED_SLUGS) {
      console.log(`🤖 [Direct Scrape] Đang kiểm tra phim slug: "${slug}"...`);
      const syncResult = await scraperService.syncMovieBySlug(slug);

      if (syncResult.success) {
        totalSynced++;
        const msg = `✅ [Trực tiếp] Đồng bộ thành công slug "${slug}": ${syncResult.message}`;
        results.push(msg);
        console.log(`   ✔️ ${msg}`);
      } else {
        const errMsg = `❌ [Trực tiếp] Thất bại với slug "${slug}": ${syncResult.message}`;
        results.push(errMsg);
        console.error(`   ${errMsg}`);
      }
      
      // Giãn cách 2 giây giữa các lần gọi API OPhim
      await delay(2000);
    }

    // 2. Cập nhật trạng thái thành công
    await prisma.scrapingLog.update({
      where: { id: logRecord.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        syncedCount: totalSynced,
        results: results as any
      }
    });

    console.log(`\n========================================================================`);
    console.log(`🎉 HOÀN THÀNH QUY TRÌNH TỰ ĐỘNG CẬP NHẬT TẬP PHIM!`);
    console.log(`📊 BÁO CÁO:`);
    console.log(`   - Tổng số phim đã xử lý thành công: ${totalSynced}`);
    console.log(`   - Ghi nhật ký Log ID: ${logRecord.id}`);
    console.log(`========================================================================\n`);

  } catch (error: any) {
    console.error('❌ Lỗi nghiêm trọng trong quá trình tự động cập nhật:', error.message);
    
    // Ghi nhận lỗi vào DB
    await prisma.scrapingLog.update({
      where: { id: logRecord.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error.message,
        results: results as any
      }
    });
  }
}

run()
  .catch(err => {
    console.error('❌ Lỗi không xác định khi thực thi script:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
