import 'dotenv/config';
import { prisma } from '../db';
import { scraperService } from '../services/scraper.service';

async function deleteMovieCascade(title: string, releaseYear?: number) {
  // Tìm phim khớp tên và năm sản xuất nếu có (để định vị chính xác phim người đóng)
  const movie = await prisma.movie.findFirst({
    where: {
      title,
      ...(releaseYear ? { releaseYear } : {})
    }
  });

  if (!movie) {
    console.log(`💡 Không tìm thấy phim người đóng "${title}" trong cơ sở dữ liệu.`);
    return;
  }

  console.log(`⚠️ Đang tiến hành xóa sạch bản người đóng: "${movie.title}" (ID: ${movie.id}, Năm: ${movie.releaseYear})...`);

  // Xóa các bảng phụ thuộc khóa ngoại
  const deletedEpisodes = await prisma.episode.deleteMany({ where: { movieId: movie.id } });
  console.log(`   - Đã xóa ${deletedEpisodes.count} tập phim.`);

  const deletedRatings = await prisma.rating.deleteMany({ where: { movieId: movie.id } });
  console.log(`   - Đã xóa ${deletedRatings.count} đánh giá.`);

  const deletedComments = await prisma.comment.deleteMany({ where: { movieId: movie.id } });
  console.log(`   - Đã xóa ${deletedComments.count} bình luận.`);

  const deletedWatchlists = await prisma.watchlist.deleteMany({ where: { movieId: movie.id } });
  console.log(`   - Đã xóa ${deletedWatchlists.count} danh sách mục yêu thích.`);

  await prisma.globalTierLeaderboard.deleteMany({ where: { movieId: movie.id } });
  console.log(`   - Đã xóa leaderboard.`);

  // Xóa phim chính
  await prisma.movie.delete({ where: { id: movie.id } });
  console.log(`✅ Đã xóa hoàn toàn thực thể phim "${title}" thành công!\n`);
}

async function run() {
  console.log('========================================================================');
  console.log('🛡️ KÍCH HOẠT QUY TRÌNH SỬA ĐỔI TOÀN DIỆN VŨ TRỤ ĐẤU PHÁ THƯƠNG KHUNG 3D');
  console.log('========================================================================\n');

  // I. Xóa bỏ 3 bản người đóng cào nhầm
  console.log('🧹 BƯỚC 1: XÓA CÁC BẢN NGƯỜI ĐÓNG (LIVE-ACTION) NHẦM LẪN...');
  
  // 1. Đấu Phá Thương Khung (Bản truyền hình 2018 - Ngô Lỗi)
  await deleteMovieCascade('Đấu Phá Thương Khung', 2018);

  // 2. Đấu Phá Thương Khung (Phần 2) (Bản truyền hình 2023)
  await deleteMovieCascade('Đấu Phá Thương Khung (Phần 2)', 2023);
  await deleteMovieCascade('Đấu Phá Thương Khung Phần 2', 2023);

  // 3. Đấu Phá Thương Khung: Thức Tỉnh (Bản điện ảnh web 2023 - Mã Bá Khiên)
  await deleteMovieCascade('Đấu Phá Thương Khung: Thức Tỉnh', 2023);

  console.log('------------------------------------------------------------------------');

  // II. Khởi tạo/Tìm kiếm Series "Vũ Trụ Đấu Phá Thương Khung"
  console.log('📌 BƯỚC 2: KHỞI TẠO HOẶC TÌM KIẾM SERIES ĐPTK HOẠT HÌNH...');
  let series = await prisma.movieSeries.findFirst({
    where: { name: 'Vũ Trụ Đấu Phá Thương Khung' }
  });

  if (!series) {
    series = await prisma.movieSeries.create({
      data: { name: 'Vũ Trụ Đấu Phá Thương Khung' }
    });
    console.log(`📌 Đã tạo mới MovieSeries: "Vũ Trụ Đấu Phá Thương Khung"`);
  } else {
    console.log(`📌 Đã tồn tại MovieSeries: "Vũ Trụ Đấu Phá Thương Khung" (ID: ${series.id})`);
  }

  console.log('------------------------------------------------------------------------');

  // III. Thực hiện cào các phần hoạt hình 3D chuẩn
  console.log('🤖 BƯỚC 3: CÀO ĐỒNG BỘ CÁC PHẦN HOẠT HÌNH 3D CHUẨN XỊN MỊN...');

  const animeList = [
    { slug: 'dau-pha-thuong-khung-phan-2', label: 'Phần 2' },
    { slug: 'dau-pha-thuong-khung-3', label: 'Phần 3' },
    { slug: 'dau-pha-thuong-khung-4', label: 'Phần 4' },
    { slug: 'dau-pha-thuong-khung-ova-4-duyen-khoi', label: 'Duyên Khởi' },
    { slug: 'dau-pha-thuong-khung-hen-uoc-ba-nam', label: 'Hẹn Ước 3 Năm' },
    { slug: 'dau-pha-thuong-khung-ngoai-truyen', label: 'Niên Phim (198 Tập)' }
  ];

  for (const anime of animeList) {
    console.log(`\n🤖 [Scrape] Đang cào phần hoạt hình: "${anime.slug}" (Nhãn: "${anime.label}")...`);
    try {
      const result = await scraperService.syncMovieBySlug(anime.slug);
      if (result.success && result.movie) {
        const movie = result.movie;
        console.log(`   ✔️ Đồng bộ thành công: "${movie.title}"`);
        
        // Liên kết phim vào sê-ri và gán nhãn
        await prisma.movie.update({
          where: { id: movie.id },
          data: {
            seriesId: series.id,
            seriesLabel: anime.label
          }
        });
        console.log(`   🔗 Liên kết thành công vào sê-ri ĐPTK dưới nhãn "${anime.label}"`);
      } else {
        console.error(`   ❌ Lỗi đồng bộ phần "${anime.slug}": ${result.message}`);
      }
    } catch (e: any) {
      console.error(`   ❌ Lỗi hệ thống khi cào "${anime.slug}":`, e.message);
    }
    // Giãn cách 2 giây tránh bị chặn IP từ OPhim
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n========================================================================');
  console.log('🎉 ĐÃ HOÀN TẤT THIẾT LẬP LẠI TOÀN BỘ VŨ TRỤ HOẠT HÌNH ĐPTK 3D!');
  console.log('========================================================================');
}

run()
  .catch(err => {
    console.error('❌ Lỗi tiến trình:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
