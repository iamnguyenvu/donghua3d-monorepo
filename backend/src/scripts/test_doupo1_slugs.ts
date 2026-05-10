// Using native global fetch in Node v20

const SLUGS_TO_TEST = [
  'dau-pha-thuong-khung-1',
  'dau-pha-thuong-khung-phan-1',
  'dau-pha-thuong-khung-hoat-hinh',
  'dau-pha-thuong-khung-hoat-hinh-phan-1',
  'dau-pha-thuong-khung-phan-1-hoat-hinh'
];

async function run() {
  console.log('🤖 Đang kiểm tra các slug hoạt hình ĐPTK phần 1...');
  for (const slug of SLUGS_TO_TEST) {
    try {
      const res = await fetch(`https://ophim1.com/phim/${slug}`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.movie) {
          console.log(`✅ SLUG: "${slug}" -> Tồn tại! Name: "${data.movie.name}" (Year: ${data.movie.year}, Episodes: ${data.episodes?.[0]?.server_data?.length || 0})`);
          continue;
        }
      }
      console.log(`❌ SLUG: "${slug}" -> Không tồn tại.`);
    } catch (e: any) {
      console.error(`❌ Lỗi khi test slug "${slug}":`, e.message);
    }
  }
}

run();

export {};
