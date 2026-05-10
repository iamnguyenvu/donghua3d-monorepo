// Using native global fetch in Node v20

const QUERIES = [
  'kiem-lai',
  'con-ra-the-thong',
  'o-re',
  'tu-xuyen',
  'tham-khong',
  'tram-than',
  'ngich-thien',
  'tuong-da',
  'than-mo',
  'dao-yeu-hanh',
  'huyen-gioi',
  'gia-thien',
  'bach-luyen',
  'thien-tuong',
  'tu-la-vo-than',
  'quan-huu-van',
  'dai-duong-thua-phong',
  'ta-la-dao-tong',
  'tru-tien',
  'ma-thoi-den',
  'ling-lung',
  'nhat-niem',
  'de-nhat-danh-sach',
  'tien-nghich',
  'hoa-phung'
];

async function testSearch(keyword: string) {
  const url = `https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json() as any;
      console.log(`\n🔍 KẾT QUẢ TÌM KIẾM CHO "${keyword}" (${url}):`);
      console.log(`   Tìm thấy: ${data.data?.params?.pagination?.totalItems || 0} phim.`);
      if (data.data?.items && data.data.items.length > 0) {
        for (const item of data.data.items) {
          console.log(`   - Name: "${item.name}"`);
          console.log(`     Slug: "${item.slug}"`);
          console.log(`     Year: ${item.year}`);
        }
      } else {
        console.log('   - Không có phim nào.');
      }
    } else {
      console.log(`❌ Yêu cầu tìm kiếm cho "${keyword}" thất bại. HTTP: ${res.status}`);
    }
  } catch (e: any) {
    console.error(`❌ Lỗi khi tìm kiếm "${keyword}":`, e.message);
  }
}

async function run() {
  console.log('🏁 Bắt đầu kiểm tra API tìm kiếm OPhim...');
  for (const q of QUERIES) {
    await testSearch(q);
  }
}

run();

export {};
