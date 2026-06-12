const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const movies = await prisma.movie.findMany({ select: { slug: true, title: true } });
  console.log(movies);
}

main().catch(console.error).finally(() => prisma.$disconnect());
