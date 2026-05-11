import 'dotenv/config';
import { prisma } from '../db';
import { scraperService } from '../services/scraper.service';

async function purgeMovie(movieId: string, title: string, releaseYear: number, reason: string) {
  console.log(`⚠️ Đang tiến hành xóa sạch bản người đóng: "${title}" (ID: ${movieId}, Năm: ${releaseYear}) | Lý do: ${reason}...`);
  
  // Cascade delete all dependent elements manually to ensure zero foreign key constraint violations
  const deletedEpisodes = await prisma.episode.deleteMany({ where: { movieId } });
  console.log(`   - Đã xóa ${deletedEpisodes.count} tập phim.`);

  const deletedRatings = await prisma.rating.deleteMany({ where: { movieId } });
  console.log(`   - Đã xóa ${deletedRatings.count} đánh giá.`);

  const deletedComments = await prisma.comment.deleteMany({ where: { movieId } });
  console.log(`   - Đã xóa ${deletedComments.count} bình luận.`);

  const deletedWatchlists = await prisma.watchlist.deleteMany({ where: { movieId } });
  console.log(`   - Đã xóa ${deletedWatchlists.count} mục yêu thích.`);

  await prisma.globalTierLeaderboard.deleteMany({ where: { movieId } });
  console.log(`   - Đã xóa xếp hạng bảng vàng.`);

  await prisma.movie.delete({ where: { id: movieId } });
  console.log(`✅ Đã xóa hoàn toàn thực thể phim "${title}" thành công!\n`);
}

async function run() {
  console.log('========================================================================');
  console.log('🧹 [Purge & Sync] Bắt đầu rà soát triệt để và khôi phục hoạt hình 3D chuẩn...');
  console.log('========================================================================\n');

  // I. RÀ SOÁT VÀ XÓA BẢN NGƯỜI ĐÓNG
  console.log('🧹 BƯỚC 1: QUÉT VÀ THÀNH TRỪNG TOÀN BỘ PHIM NGƯỜI ĐÓNG (LIVE-ACTION)...');
  
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
    let reason = '';

    // 1. Kiểm tra Đấu Phá Thương Khung (Phần 2) Live-Action (34 tập, 2023, Fights Break Sphere Season 2)
    if (titleLower.includes('đấu phá thương khung') && (
      altTitlesLower.includes('fights break sphere season') || 
      altTitlesLower.includes('battle through the heaven season') || 
      m.id === '304fab93-4c9f-4d54-9a92-a5662c7bed8c' || 
      (m.releaseYear === 2023 && m._count.episodes === 34)
    )) {
      isLiveAction = true;
      reason = 'Bản truyền hình người đóng S2 (2023 - 34 tập)';
    }

    // 2. Kiểm tra Đấu Phá Thương Khung S1 Live-Action (2018 - 45 tập, Ngô Lỗi)
    else if (titleLower === 'đấu phá thương khung' && (
      m.releaseYear === 2018 || 
      (altTitlesLower.includes('battle through the heaven') && !altTitlesLower.includes('fights break sphere'))
    )) {
      isLiveAction = true;
      reason = 'Bản truyền hình người đóng S1 (2018 - Ngô Lỗi)';
    }

    // 3. Kiểm tra Đấu Phá Thương Khung: Thức Tỉnh (Bản điện ảnh Web 2023)
    else if (titleLower.includes('thức tỉnh') && titleLower.includes('đấu phá')) {
      isLiveAction = true;
      reason = 'Bản điện ảnh người đóng 2023 (Mã Bá Khiên)';
    }

    // 4. Kiểm tra Tử Xuyên (Phần 2) Live-Action (40 tập, Eternal Brotherhood Season 2 / ID đặc thù)
    else if (titleLower.includes('tử xuyên') && (
      altTitlesLower.includes('eternal brotherhood') || 
      m.id === '5a6b9fde-eb64-48c8-b044-cc52f933fdeb'
    )) {
      isLiveAction = true;
      reason = 'Bản truyền hình người đóng (Eternal Brotherhood - 40 tập)';
    }

    // 4.5. Kiểm tra các mục cụ thể theo yêu cầu người dùng: "Đấu Phá Thương Khung Ngoại Truyện" & "Đấu Phá Thương Khung OVA 4: Duyên Khởi"
    else if (
      m.id === '83b70af2-3640-47f8-a1a6-abbb6efb62ac' ||
      m.id === 'be76a355-b898-4f42-b207-99c43391f0de' ||
      titleLower === 'đấu phá thương khung ngoại truyện' ||
      titleLower === 'đấu phá thương khung ova 4: duyên khởi'
    ) {
      isLiveAction = true;
      reason = 'Xóa theo yêu cầu người dùng (Mục trùng lặp hoặc không mong muốn)';
    }

    // 5. Kiểm tra các phim thuộc danh sách từ khóa Live-Action chung
    else {
      const LIVE_ACTION_PATTERNS = [
        'thanh vân chí',       // Tru Tiên người đóng
        'my heroic husband',   // Ở Rể người đóng
        'ở rể',                // Ở Rể (không có bản hoạt hình 3D trên OPhim)
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
          reason = `Khớp từ khóa Live-Action: "${pattern}"`;
          break;
        }
      }
    }

    // 6. Kiểm tra Tru Tiên Live-Action (Bản điện ảnh Tiêu Chiến)
    if (!isLiveAction && titleLower === 'tru tiên') {
      if (descriptionLower.includes('tiêu chiến') || descriptionLower.includes('lý thấm') || descriptionLower.includes('mạnh mỹ kỳ')) {
        isLiveAction = true;
        reason = 'Bản điện ảnh người đóng 2019 (Tiêu Chiến)';
      }
    }

    if (isLiveAction) {
      await purgeMovie(m.id, m.title, m.releaseYear, reason);
      deletedCount++;
    }
  }

  console.log(`\n------------------------------------------------------------------------`);
  console.log(`🧹 ĐÃ XÓA SẠCH ${deletedCount} BẢN NGƯỜI ĐÓNG.`);
  console.log(`------------------------------------------------------------------------\n`);

  // II. KHÔI PHỤC VÀ ĐỒNG BỘ CÁC BẢN HOẠT HÌNH 3D CHUẨN XỊN
  console.log('🌟 BƯỚC 2: KHÔI PHỤC VÀ ĐỒNG BỘ CÁC BẢN HOẠT HÌNH 3D CHUẨN TỪ OPHIM...');

  // 1. Đồng bộ Đấu Phá Thương Khung Phần 2 (Animation, slug: dau-pha-thuong-khung-2)
  let dpSeries = await prisma.movieSeries.findFirst({
    where: { name: 'Vũ Trụ Đấu Phá Thương Khung' }
  });
  if (!dpSeries) {
    dpSeries = await prisma.movieSeries.create({
      data: { name: 'Vũ Trụ Đấu Phá Thương Khung' }
    });
  }

  console.log('🤖 [Scrape] Đang đồng bộ Đấu Phá Thương Khung Phần 2 (slug: dau-pha-thuong-khung-2)...');
  const dp2Result = await scraperService.syncMovieBySlug('dau-pha-thuong-khung-2');
  if (dp2Result.success && dp2Result.movie) {
    await prisma.movie.update({
      where: { id: dp2Result.movie.id },
      data: {
        seriesId: dpSeries.id,
        seriesLabel: 'Phần 2'
      }
    });
    console.log(`   🔗 Đã liên kết Đấu Phá Thương Khung Phần 2 vào sê-ri "Vũ Trụ Đấu Phá Thương Khung"`);
  } else {
    console.error(`   ❌ Lỗi khi đồng bộ Đấu Phá Thương Khung Phần 2: ${dp2Result.message}`);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Thiết lập Sê-ri Vũ Trụ Tử Xuyên và đồng bộ các phần hoạt hình chuẩn
  let tzSeries = await prisma.movieSeries.findFirst({
    where: { name: 'Vũ Trụ Tử Xuyên' }
  });
  if (!tzSeries) {
    tzSeries = await prisma.movieSeries.create({
      data: { name: 'Vũ Trụ Tử Xuyên' }
    });
    console.log(`📌 Đã tạo mới MovieSeries: "Vũ Trụ Tử Xuyên"`);
  }

  // Thu hồi và dọn dẹp các Sê-ri con lỗi
  const oldTzSeriesList = await prisma.movieSeries.findMany({
    where: {
      name: { in: ['Vũ Trụ Tử Xuyên (Phần 2)', 'Vũ Trụ Tử Xuyên Phần 2'] }
    }
  });
  for (const oldS of oldTzSeriesList) {
    await prisma.movie.updateMany({
      where: { seriesId: oldS.id },
      data: { seriesId: tzSeries.id }
    });
    await prisma.movieSeries.delete({ where: { id: oldS.id } });
    console.log(`   🧹 Đã gộp sê-ri cũ "${oldS.name}" vào "${tzSeries.name}".`);
  }

  // Đồng bộ Tử Xuyên Phần 1 (Animation, slug: tu-xuyen)
  console.log('\n🤖 [Scrape] Đang đồng bộ Tử Xuyên Phần 1 (slug: tu-xuyen)...');
  const tz1Result = await scraperService.syncMovieBySlug('tu-xuyen');
  if (tz1Result.success && tz1Result.movie) {
    await prisma.movie.update({
      where: { id: tz1Result.movie.id },
      data: {
        seriesId: tzSeries.id,
        seriesLabel: 'Phần 1'
      }
    });
    console.log(`   🔗 Đã liên kết Tử Xuyên Phần 1 vào sê-ri "Vũ Trụ Tử Xuyên"`);
  } else {
    console.error(`   ❌ Lỗi khi đồng bộ Tử Xuyên Phần 1: ${tz1Result.message}`);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Đồng bộ Tử Xuyên Phần 2 (Animation, slug: tu-xuyen-phan-2-2025)
  console.log('\n🤖 [Scrape] Đang đồng bộ Tử Xuyên Phần 2 (slug: tu-xuyen-phan-2-2025)...');
  const tz2Result = await scraperService.syncMovieBySlug('tu-xuyen-phan-2-2025');
  if (tz2Result.success && tz2Result.movie) {
    await prisma.movie.update({
      where: { id: tz2Result.movie.id },
      data: {
        seriesId: tzSeries.id,
        seriesLabel: 'Phần 2'
      }
    });
    console.log(`   🔗 Đã liên kết Tử Xuyên Phần 2 vào sê-ri "Vũ Trụ Tử Xuyên"`);
  } else {
    console.error(`   ❌ Lỗi khi đồng bộ Tử Xuyên Phần 2: ${tz2Result.message}`);
  }

  // III. DỌN SÊ-RI TRỐNG
  const seriesList = await prisma.movieSeries.findMany({
    include: { _count: { select: { movies: true } } }
  });
  for (const s of seriesList) {
    if (s._count.movies === 0) {
      await prisma.movieSeries.delete({ where: { id: s.id } });
      console.log(`🗑️ Đã xóa sê-ri trống: "${s.name}"`);
    }
  }

  console.log(`\n========================================================================`);
  console.log(`🎉 HOÀN TẤT LOẠI BỎ LIVE-ACTION VÀ KHÔI PHỤC HOẠT HÌNH 3D CHUẨN!`);
  console.log(`========================================================================\n`);
}

run()
  .catch(err => {
    console.error('❌ Lỗi dọn dẹp và khôi phục:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
