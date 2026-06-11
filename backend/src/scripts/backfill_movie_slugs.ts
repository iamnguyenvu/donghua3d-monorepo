import 'dotenv/config';
import { prisma } from '../db';

// A simple slugify function
function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-');
}

async function run() {
  console.log('🔄 Bắt đầu backfill slug cho tất cả phim...');
  
  const movies = await prisma.movie.findMany();
  console.log(`🔍 Tìm thấy ${movies.length} phim trong DB.`);

  let successCount = 0;
  let errorCount = 0;

  for (const movie of movies) {
    let baseSlug = slugify(movie.title);
    if (!baseSlug) baseSlug = `movie-${Date.now()}`;
    
    let finalSlug = baseSlug;
    let counter = 1;
    let isUnique = false;

    // Ensure slug is unique
    while (!isUnique) {
      const existing = await prisma.movie.findFirst({
        where: { slug: finalSlug, id: { not: movie.id } }
      });
      if (existing) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      } else {
        isUnique = true;
      }
    }

    try {
      await prisma.movie.update({
        where: { id: movie.id },
        data: { slug: finalSlug }
      });
      successCount++;
      if (successCount % 50 === 0) {
        console.log(`✅ Đã update ${successCount} phim...`);
      }
    } catch (err) {
      console.error(`❌ Lỗi update phim ID ${movie.id}:`, err);
      errorCount++;
    }
  }

  console.log(`\n🎉 Hoàn thành backfill!`);
  console.log(`   - Thành công: ${successCount}`);
  console.log(`   - Thất bại: ${errorCount}`);
}

run()
  .catch(err => {
    console.error('❌ Lỗi:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
