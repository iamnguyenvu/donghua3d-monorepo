import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Backfilling movie airing days...');

  const schedules = [
    { title: 'Thế Giới Hoàn Mỹ', airingDay: 5 }, // Friday
    { title: 'Đấu La Đại Lục', airingDay: 6 }, // Saturday
    { title: 'Phàm Nhân Tu Tiên', airingDay: 7 }, // Sunday
    { title: 'Đại Đạo Triều Thiên', airingDay: 2 } // Tuesday
  ];

  for (const item of schedules) {
    const movie = await prisma.movie.findFirst({
      where: { title: item.title }
    });

    if (movie) {
      await prisma.movie.update({
        where: { id: movie.id },
        data: { airingDay: item.airingDay }
      });
      console.log(`✅ Set airingDay to ${item.airingDay} for movie: ${item.title}`);
    } else {
      console.log(`ℹ️ Movie not found: ${item.title}`);
    }
  }

  console.log('🎉 Airing days backfilled successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error backfilling airing days:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
