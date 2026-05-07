import { PrismaClient, Role, Tier } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Default Admin User
  const adminEmail = 'admin@donghua3d.me';
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminId = '';
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        password: passwordHash,
        role: Role.ADMIN,
        reputationScore: 100,
        veteranSince: new Date(),
      },
    });
    adminId = admin.id;
    console.log(`✅ Admin user created: ${adminEmail} (password: admin123)`);
  } else {
    adminId = existingAdmin.id;
    console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
  }

  // 2. Seed Default Expert User (for verified ratings)
  const expertEmail = 'expert@donghua3d.me';
  const existingExpert = await prisma.user.findUnique({
    where: { email: expertEmail },
  });

  if (!existingExpert) {
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('expert123', salt);

    await prisma.user.create({
      data: {
        email: expertEmail,
        password: passwordHash,
        role: Role.EXPERT,
        reputationScore: 100,
        veteranSince: new Date(),
      },
    });
    console.log(`✅ Expert user created: ${expertEmail} (password: expert123)`);
  } else {
    console.log(`ℹ️ Expert user already exists: ${expertEmail}`);
  }

  // 3. Seed Sample Movies & Global Leaderboard States
  const sampleMovies = [
    {
      title: 'Perfect World',
      altTitles: ['Thế Giới Hoàn Mỹ', '完美世界'],
      description: 'In the desolate wilderness, a small child raised by an orphan village rises to conquer the heavens.',
      studio: 'Foch Film',
      releaseYear: 2021,
      posterUrl: '/static/uploads/posters/perfect-world.jpg',
      bannerUrl: '/static/uploads/banners/perfect-world-banner.jpg',
      episodes: [
        {
          episodeNumber: 1,
          title: 'The Child of Stone Village',
          description: 'Shi Hao demonstrates incredible raw power and is tested by village elders.',
          videoUrl: '/static/uploads/hls/perfect-world-ep1/index.m3u8',
          duration: 1200.0, // 20 mins
          introStart: 10.0,
          introEnd: 100.0,
          outroStart: 1100.0,
          outroEnd: 1200.0,
          thumbnail: '/static/uploads/thumbnails/perfect-world-ep1.jpg',
        },
        {
          episodeNumber: 2,
          title: 'The Divine Beast Encounter',
          description: 'A terrifying beast approaches the stone village boundary.',
          videoUrl: '/static/uploads/hls/perfect-world-ep2/index.m3u8',
          duration: 1180.0,
          introStart: 15.0,
          introEnd: 105.0,
          outroStart: 1080.0,
          outroEnd: 1180.0,
          thumbnail: '/static/uploads/thumbnails/perfect-world-ep2.jpg',
        }
      ]
    },
    {
      title: 'Soul Land',
      altTitles: ['Đấu La Đại Lục', '斗罗大陆'],
      description: 'Tang San, having committed a forbidden crime in his martial sect, reincarnates in Soul Land with twin high-tier spirits.',
      studio: 'Sparkly Key Animation Studio',
      releaseYear: 2018,
      posterUrl: '/static/uploads/posters/soul-land.jpg',
      bannerUrl: '/static/uploads/banners/soul-land-banner.jpg',
      episodes: [
        {
          episodeNumber: 1,
          title: 'The Reincarnation of Tang San',
          description: 'Tang San leaps off Hell Peak and awakens his Blue Silver Grass spirit.',
          videoUrl: '/static/uploads/hls/soul-land-ep1/index.m3u8',
          duration: 1300.0,
          introStart: 20.0,
          introEnd: 110.0,
          outroStart: 1200.0,
          outroEnd: 1300.0,
          thumbnail: '/static/uploads/thumbnails/soul-land-ep1.jpg',
        }
      ]
    },
    {
      title: 'A Record of a Mortals Journey to Immortality',
      altTitles: ['Phàm Nhân Tu Tiên', '凡人修仙传'],
      description: 'An ordinary village boy accidentally gains entry into an esoteric sect and begins his journey of cautious cultivation.',
      studio: 'Original Force',
      releaseYear: 2020,
      posterUrl: '/static/uploads/posters/mortals-journey.jpg',
      bannerUrl: '/static/uploads/banners/mortals-journey-banner.jpg',
      episodes: [
        {
          episodeNumber: 1,
          title: 'The Mountain Examination',
          description: 'Han Li arrives at the Seven Mysteries Sect and undergoes the primary physical trials.',
          videoUrl: '/static/uploads/hls/mortals-journey-ep1/index.m3u8',
          duration: 1250.0,
          introStart: 5.0,
          introEnd: 95.0,
          outroStart: 1150.0,
          outroEnd: 1250.0,
          thumbnail: '/static/uploads/thumbnails/mortals-journey-ep1.jpg',
        }
      ]
    }
  ];

  for (const item of sampleMovies) {
    const existingMovie = await prisma.movie.findFirst({
      where: { title: item.title },
    });

    let movie;
    if (!existingMovie) {
      movie = await prisma.movie.create({
        data: {
          title: item.title,
          altTitles: item.altTitles,
          description: item.description,
          studio: item.studio,
          releaseYear: item.releaseYear,
          posterUrl: item.posterUrl,
          bannerUrl: item.bannerUrl,
        },
      });
      console.log(`✅ Movie created: ${item.title}`);
    } else {
      movie = existingMovie;
      console.log(`ℹ️ Movie already exists: ${item.title}`);
    }

    // Seed Episodes
    for (const ep of item.episodes) {
      const existingEp = await prisma.episode.findUnique({
        where: {
          unique_movie_episode: {
            movieId: movie.id,
            episodeNumber: ep.episodeNumber,
          },
        },
      });

      if (!existingEp) {
        await prisma.episode.create({
          data: {
            movieId: movie.id,
            episodeNumber: ep.episodeNumber,
            title: ep.title,
            description: ep.description,
            videoUrl: ep.videoUrl,
            duration: ep.duration,
            introStart: ep.introStart,
            introEnd: ep.introEnd,
            outroStart: ep.outroStart,
            outroEnd: ep.outroEnd,
            thumbnail: ep.thumbnail,
          },
        });
        console.log(`  └─ ✅ Episode ${ep.episodeNumber} created`);
      }
    }

    // Seed/Initialize Global Leaderboard Cache
    const existingLeaderboard = await prisma.globalTierLeaderboard.findUnique({
      where: { movieId: movie.id },
    });

    if (!existingLeaderboard) {
      await prisma.globalTierLeaderboard.create({
        data: {
          movieId: movie.id,
          s_tier_count: 0,
          a_tier_count: 0,
          b_tier_count: 0,
          c_tier_count: 0,
          d_tier_count: 0,
          f_tier_count: 0,
          tierScore: 0.0,
          globalTier: Tier.C,
        },
      });
      console.log(`  └─ ✅ Leaderboard initialized`);
    }
  }

  console.log('🌲 Seeding process successfully completed.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
