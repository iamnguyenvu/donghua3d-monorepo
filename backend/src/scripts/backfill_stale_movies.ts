import { scraperService } from '../services/scraper.service';
import { prisma } from '../db';

const targetSlugs = [
  'thuong-nguyen-o',
  'to-be-hero-x',
  'linh-lung-phan-2',
  'thieu-nien-ca-hanh-phan-4',
  'thieu-nien-ca-hanh-phan-2',
  'tru-tien-phan-3',
  'bach-luyen-thanh-than',
  'au-la-ai-luc'
];

async function run() {
  console.log('🏁 [Manual Backfill] Starting sync for stale/gap movies...');
  for (const slug of targetSlugs) {
    try {
      console.log(`\n🤖 [Manual Backfill] Syncing: "${slug}"...`);
      const res = await scraperService.syncMovieBySlug(slug);
      if (res.success) {
        console.log(`✅ [Manual Backfill] Success for "${slug}": ${res.message}`);
      } else {
        console.log(`❌ [Manual Backfill] Failed for "${slug}": ${res.message}`);
      }
    } catch (e: any) {
      console.error(`❌ [Manual Backfill] Error syncing "${slug}":`, e.message);
    }
  }
  
  console.log('\n--- VERIFICATION FROM DATABASE ---');
  for (const slug of targetSlugs) {
    const movie = await prisma.movie.findFirst({
      where: { slug },
      include: {
        episodes: {
          include: {
            sources: true
          }
        }
      }
    });

    if (movie) {
      console.log(`🎥 Phim: "${movie.title}" (${movie.slug})`);
      console.log(`   - Số tập hiện tại trong DB: ${movie.episodes.length}`);
      const serverGroups = new Map<string, number>();
      movie.episodes.forEach(ep => {
        ep.sources.forEach(src => {
          serverGroups.set(src.serverName, (serverGroups.get(src.serverName) || 0) + 1);
        });
      });
      console.log(`   - Danh sách server nguồn:`);
      for (const [srv, count] of serverGroups.entries()) {
        console.log(`     └─ Server: "${srv}" (${count} tập)`);
      }
    }
  }
  console.log('\n🏁 [Manual Backfill] Completed backfill process!');
}

run()
  .catch(err => console.error(err))
  .finally(async () => {
    await prisma.$disconnect();
  });
