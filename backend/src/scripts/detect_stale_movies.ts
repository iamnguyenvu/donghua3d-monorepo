import { prisma } from '../db';

async function run() {
  console.log('🔍 [Diagnostic] Scanning database for movies with potential range-parsing issues...');
  
  const movies = await prisma.movie.findMany({
    include: {
      episodes: {
        select: {
          episodeNumber: true,
          title: true
        }
      }
    }
  });

  console.log(`📊 Found ${movies.length} movies in the catalog.`);
  
  let issuesCount = 0;
  for (const movie of movies) {
    const epCount = movie.episodes.length;
    
    // Check if there are large gaps in episode numbers
    if (epCount > 0) {
      const sortedNums = movie.episodes.map(e => e.episodeNumber).sort((a, b) => a - b);
      const minEp = sortedNums[0];
      const maxEp = sortedNums[sortedNums.length - 1];
      
      // Gaps check
      const expectedCount = maxEp - minEp + 1;
      const missingCount = expectedCount - epCount;
      
      const hasGaps = missingCount > 0;
      const isHighlySuspicious = epCount < 15 && maxEp > 30; // E.g. only 4 episodes but max number is 40
      
      if (hasGaps || isHighlySuspicious) {
        issuesCount++;
        console.log(`\n⚠️ Movie: "${movie.title}" (slug: ${movie.slug})`);
        console.log(`   - Status: ${movie.status}`);
        console.log(`   - Release Year: ${movie.releaseYear}`);
        console.log(`   - Episodes in DB: ${epCount}`);
        console.log(`   - Episode Numbers: [ ${sortedNums.join(', ')} ]`);
        console.log(`   - Missing episodes in range: ${missingCount}`);
      }
    }
  }

  console.log(`\n🏁 Scan completed. Found ${issuesCount} movies with potential issues.`);
}

run()
  .catch(err => {
    console.error('❌ Diagnostic error:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
