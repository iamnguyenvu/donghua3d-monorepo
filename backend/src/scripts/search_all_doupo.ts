import 'dotenv/config';

async function run() {
  console.log('🤖 Bắt đầu tìm kiếm chi tiết tất cả các phim Đấu Phá Thương Khung trên OPhim API...');
  const keyword = encodeURIComponent('đấu phá thương khung');
  try {
    const res = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${keyword}`);
    if (!res.ok) {
      console.error('❌ Không thể kết nối với OPhim API.');
      return;
    }
    const data = await res.json() as any;
    if (!data.data || !data.data.items) {
      console.log('💡 Không tìm thấy kết quả.');
      return;
    }

    console.log(`\n📊 Tìm thấy ${data.data.items.length} kết quả trên OPhim:`);
    for (const item of data.data.items) {
      const slug = item.slug;
      const detailRes = await fetch(`https://ophim1.com/phim/${slug}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json() as any;
        const movie = detailData.movie;
        const epCount = detailData.episodes?.[0]?.server_data?.length || 0;
        console.log(`----------------------------------------`);
        console.log(`🎥 Name:       "${movie.name}"`);
        console.log(`   Origin Name:"${movie.origin_name}"`);
        console.log(`   Slug:       "${slug}"`);
        console.log(`   Year:       ${movie.year}`);
        console.log(`   Episodes:   ${epCount}`);
        console.log(`   Content:    ${movie.content?.substring(0, 150)}...`);
      }
    }
  } catch (err: any) {
    console.error('❌ Lỗi:', err.message);
  }
}

run();
export {};
