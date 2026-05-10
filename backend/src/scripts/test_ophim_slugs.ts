// Using native global fetch in Node v20

const SLUGS_TO_TEST = [
  // Đấu Phá Thương Khung
  'dau-pha-thuong-khung',
  'dau-pha-thuong-khung-phan-2',
  'dau-pha-thuong-khung-phan-3',
  'dau-pha-thuong-khung-phan-4',
  'dau-pha-thuong-khung-phan-5',
  'dau-pha-thuong-khung-dac-biet',
  'dau-pha-thuong-khung-tam-nien-chi-uoc',
  'dau-pha-thuong-khung-nguyen-khoi',
  'dau-pha-thuong-khung-phan-5-nhan-phim',
  'dau-pha-thuong-khung-nien-phim',
  'dau-pha-thuong-khung-phan-5-nien-phim',

  // Đấu La Đại Lục
  'dau-la-dai-luc',
  'dau-la-dai-luc-phan-2',
  'dau-la-dai-luc-2',
  'dau-la-dai-luc-2-tuyet-the-duong-mon',
  'tuyet-the-duong-mon',

  // Tử Xuyên
  'tu-xuyen',
  'tu-xuyen-phan-1',

  // Thiếu Niên Ca Hành
  'thieu-nien-ca-hanh',
  'thieu-nien-ca-hanh-phan-2',
  'thieu-nien-ca-hanh-phan-3',
  'thieu-nien-ca-hanh-phan-4',

  // Họa Giang Hồ Chi Bất Lương Nhân
  'hoa-giang-ho-chi-bat-luong-nhan',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-2',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-3',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-4',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-5',
  'hoa-giang-ho-chi-bat-luong-nhan-phan-6',

  // Thế Giới Hoàn Mỹ Movie
  'the-gioi-hoan-my-ban-dien-anh',
  'the-gioi-hoan-my-movie',
  'the-gioi-hoan-my-dai-chien-thuong-co'
];

async function run() {
  console.log('🤖 Đang kiểm tra các slug trên API OPhim (https://ophim1.com)...');
  
  const results: Array<{ slug: string; exists: boolean; name?: string; originName?: string; episodesCount?: number }> = [];

  for (const slug of SLUGS_TO_TEST) {
    try {
      const res = await fetch(`https://ophim1.com/phim/${slug}`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.movie) {
          const episodesCount = data.episodes?.[0]?.server_data?.length || 0;
          results.push({
            slug,
            exists: true,
            name: data.movie.name,
            originName: data.movie.origin_name,
            episodesCount
          });
          continue;
        }
      }
      results.push({ slug, exists: false });
    } catch (e: any) {
      console.error(`❌ Lỗi khi test slug "${slug}":`, e.message);
      results.push({ slug, exists: false });
    }
  }

  console.log('\n📊 KẾT QUẢ KIỂM TRA SLUG:');
  console.log('==================================================');
  for (const item of results) {
    if (item.exists) {
      console.log(`✅ SLUG: "${item.slug}" -> Tồn tại!`);
      console.log(`   Tên tiếng Việt: "${item.name}"`);
      console.log(`   Tên gốc: "${item.originName}"`);
      console.log(`   Số tập: ${item.episodesCount}`);
    } else {
      console.log(`❌ SLUG: "${item.slug}" -> KHÔNG tồn tại.`);
    }
    console.log('--------------------------------------------------');
  }
}

run();

export {};
