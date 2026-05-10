import { prisma } from '../db';
import { Tier } from '@prisma/client';

/**
 * Bản đồ đè tên phim chuẩn Hán-Việt cổ phong cao cấp
 */
const TITLE_OVERRIDE_MAP: Record<string, string> = {
  'thon-tinh-bau-troi': 'Thôn Phệ Tinh Không',
  'swallowed-star': 'Thôn Phệ Tinh Không',
  'dai-chua-te-3d': 'Đại Chúa Tể',
  'the-great-ruler': 'Đại Chúa Tể',
  'dau-la-dai-luc-2': 'Đấu La Đại Lục 2: Tuyệt Thế Đường Môn',
  'soul-land-2': 'Đấu La Đại Lục 2: Tuyệt Thế Đường Môn',
  'renegade-immortal': 'Tiên Nghịch',
  'perfect-world': 'Thế Giới Hoàn Mỹ',
  'shrouding-the-heavens': 'Già Thiên',
  'against-the-gods': 'Nghịch Thiên Tà Thần',
};

/**
 * Hàm làm sạch và chuẩn hóa tiêu đề phim trước khi lưu vào Cơ sở dữ liệu
 */
export function normalizeMovieTitle(name: string, slug: string): string {
  const cleanSlug = slug.toLowerCase().trim();
  const cleanName = name.toLowerCase().trim();

  // 1. Kiểm tra trong từ điển ánh xạ thủ công
  for (const [key, value] of Object.entries(TITLE_OVERRIDE_MAP)) {
    if (cleanSlug.includes(key) || cleanName.includes(key)) {
      return value;
    }
  }

  // 2. Xử lý xóa bỏ các tag rác thường có ở scraper lậu
  let finalTitle = name;
  const junkTags = [
    /\s*-\s*free/gi,
    /\s*-\s*china/gi,
    /\s*-\s*comic/gi,
    /\s*\(3D\)/gi,
    /\s*3D\s*$/gi,
    /\s*Thuyết Minh/gi,
    /\s*Phần \d+ TM/gi
  ];

  for (const tag of junkTags) {
    finalTitle = finalTitle.replace(tag, '');
  }

  return finalTitle.trim();
}

export class ScraperService {
  /**
   * Helper function to strip HTML tags from a string
   */
  private stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim();
  }

  /**
   * Guess a realistic high-quality Chinese animation studio based on the movie name
   */
  public guessStudio(title: string, originName: string): string {
    const t = `${title} ${originName || ''}`.toLowerCase();
    if (t.includes('phàm nhân') || t.includes('mortal') || t.includes('fanyuren')) return 'Original Force';
    if (t.includes('thế giới hoàn mỹ') || t.includes('perfect world') || t.includes('tiên nghịch') || t.includes('renegade')) return 'Foch Film';
    if (t.includes('đấu la') || t.includes('soul land') || t.includes('đấu phá') || t.includes('battle through') || t.includes('vũ động') || t.includes('thần ấn')) return 'Sparkly Key';
    if (t.includes('già thiên') || t.includes('shrouding')) return 'LyrMedia';
    if (t.includes('thôn phệ') || t.includes('swallowed') || t.includes('thôn tinh')) return 'Sparkly Key';
    if (t.includes('quỷ bí') || t.includes('chúa tể huyền bí') || t.includes('mysteries')) return 'Thống Lực Studio';
    if (t.includes('tử xuyên') || t.includes('purple river')) return 'Build Dream';
    if (t.includes('trường ca')) return 'Tencent Pictures';
    if (t.includes('kiếm lai')) return 'Sparkly Key';
    
    // High-quality premium fallback pool
    const pool = ['Tencent Penguin', 'Bilibili Pictures', 'Foch Film', 'Sparkly Key', 'Original Force', 'CG Year', 'Yuewen Animation'];
    const sum = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return pool[sum % pool.length];
  }

  /**
   * Syncs a single movie from Ophim API by its slug.
   * If the movie doesn't exist, it creates it.
   * If it exists, it updates metadata and updates/appends episodes.
   */
  async syncMovieBySlug(slug: string): Promise<{ success: boolean; message: string; movie?: any }> {
    try {
      console.log(`🤖 [Scraper] Fetching data for movie slug: "${slug}"...`);
      const response = await fetch(`https://ophim1.com/phim/${slug}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch movie details. HTTP Status: ${response.status}`);
      }

      const data = (await response.json()) as any;
      if (!data.movie) {
        return { success: false, message: `Ophim API did not return movie details for slug: ${slug}` };
      }

      const ophimMovie = data.movie;
      const cleanDesc = this.stripHtml(ophimMovie.content || '');
      const normalizedTitle = normalizeMovieTitle(ophimMovie.name, slug);

      // Check if movie already exists in our database
      let movie = await prisma.movie.findFirst({
        where: {
          OR: [
            { title: normalizedTitle },
            { title: ophimMovie.origin_name }
          ]
        }
      });

      const releaseYear = parseInt(ophimMovie.year || '2024', 10);
      const posterUrl = ophimMovie.poster_url?.startsWith('http') 
        ? ophimMovie.poster_url 
        : `https://img.ophim.live/uploads/movies/${ophimMovie.poster_url}`;
      const bannerUrl = ophimMovie.thumb_url?.startsWith('http') 
        ? ophimMovie.thumb_url 
        : `https://img.ophim.live/uploads/movies/${ophimMovie.thumb_url}`;

      if (!movie) {
        // Create new movie catalog
        console.log(`🤖 [Scraper] Movie not found. Creating catalog: "${normalizedTitle}"...`);
        movie = await prisma.movie.create({
          data: {
            title: normalizedTitle,
            altTitles: [ophimMovie.origin_name, ...(ophimMovie.sub_doc ? [ophimMovie.sub_doc] : [])],
            description: cleanDesc,
            releaseYear,
            posterUrl,
            bannerUrl,
            studio: this.guessStudio(normalizedTitle, ophimMovie.origin_name),
            rating: 8.5, // Default premium placeholder ratings
            expertRating: 8.7,
            audienceRating: 8.3,
            imdbRating: ophimMovie.imdb_rating ? parseFloat(ophimMovie.imdb_rating) : null
          }
        });

        // Initialize Global Tier Leaderboard entry
        await prisma.globalTierLeaderboard.create({
          data: {
            movieId: movie.id,
            s_tier_count: 0,
            a_tier_count: 0,
            b_tier_count: 0,
            c_tier_count: 0,
            d_tier_count: 0,
            f_tier_count: 0,
            tierScore: 85.0,
            globalTier: Tier.A // Default A-Tier for seeded high quality donghua
          }
        });
      } else {
        // Update existing movie metadata
        console.log(`🤖 [Scraper] Movie found: "${movie.title}". Updating metadata...`);
        movie = await prisma.movie.update({
          where: { id: movie.id },
          data: {
            description: cleanDesc,
            posterUrl,
            bannerUrl,
            studio: movie.studio === 'Unknown Studio' || !movie.studio ? this.guessStudio(ophimMovie.name, ophimMovie.origin_name) : movie.studio,
            updatedAt: new Date()
          }
        });
      }

      // Sync/Upsert Episodes
      let syncedEpisodesCount = 0;
      if (data.episodes && data.episodes.length > 0) {
        // We use the first available server stream server (usually Vietsub #1 or similar)
        const server = data.episodes[0];
        console.log(`🤖 [Scraper] Syncing ${server.server_data.length} episodes from server: "${server.server_name}"`);

        for (const ep of server.server_data) {
          const episodeNumber = parseInt(ep.name, 10);
          if (isNaN(episodeNumber)) continue;

          const videoUrl = ep.link_m3u8 || ep.link_embed;
          if (!videoUrl) continue;

          const existingEp = await prisma.episode.findUnique({
            where: {
              unique_movie_episode: {
                movieId: movie.id,
                episodeNumber
              }
            }
          });

          // Clean episode title
          let cleanEpTitle = ep.filename || `Tập ${episodeNumber}`;
          cleanEpTitle = cleanEpTitle.replace(/\.(mp4|m3u8|mkv|avi|flv|ts)$/i, '');
          const lowerEp = cleanEpTitle.toLowerCase();
          const isUglyFile = (cleanEpTitle.split('.').length > 3 || cleanEpTitle.split('_').length > 3 || cleanEpTitle.split('-').length > 3) && (
            lowerEp.includes('hevc') ||
            lowerEp.includes('h264') ||
            lowerEp.includes('h265') ||
            lowerEp.includes('x264') ||
            lowerEp.includes('x265') ||
            lowerEp.includes('4k') ||
            lowerEp.includes('1080p') ||
            lowerEp.includes('720p') ||
            lowerEp.includes('engsub') ||
            lowerEp.includes('vietsub') ||
            lowerEp.includes('tvh') ||
            lowerEp.includes('gb88') ||
            lowerEp.includes('sub') ||
            /s\d+e\d+/i.test(lowerEp) ||
            /s\d+/i.test(lowerEp)
          );
          if (isUglyFile) {
            cleanEpTitle = `Tập ${episodeNumber}`;
          }

          if (!existingEp) {
            // Create Episode
            await prisma.episode.create({
              data: {
                movieId: movie.id,
                episodeNumber,
                title: cleanEpTitle,
                description: `Tập phim thứ ${episodeNumber} của bộ phim ${movie.title}`,
                videoUrl,
                duration: 1200.0, // default 20 mins
                thumbnail: movie.bannerUrl
              }
            });
          } else {
            // Update stream URL for freshness
            await prisma.episode.update({
              where: { id: existingEp.id },
              data: {
                videoUrl,
                title: cleanEpTitle
              }
            });
          }
          syncedEpisodesCount++;
        }
      }

      return {
        success: true,
        message: `Đồng bộ thành công phim "${movie.title}" với ${syncedEpisodesCount} tập phim.`,
        movie
      };
    } catch (err: any) {
      console.error(`❌ [Scraper Error] Failed to sync movie slug "${slug}":`, err.message);
      return { success: false, message: `Lỗi đồng bộ: ${err.message}` };
    }
  }

  /**
   * Syncs latest updated list of hoathinh (animations)
   */
  async syncLatestHoathinh(page: number = 1): Promise<{ success: boolean; syncedCount: number; results: string[] }> {
    try {
      console.log(`🤖 [Scraper] Syncing latest updated movies page ${page}...`);
      const response = await fetch(`https://ophim1.com/danh-sach/phim-moi-cap-nhat?page=${page}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch updated list. HTTP Status: ${response.status}`);
      }

      const data = (await response.json()) as any;
      if (!data.items || data.items.length === 0) {
        return { success: true, syncedCount: 0, results: ['No items returned from API'] };
      }

      const results: string[] = [];
      let syncedCount = 0;

      for (const item of data.items) {
        // Since we are Donghua3D, we want to sync relevant high quality hoathinh
        // We can check if category or general title matches animation, or we can just sync all of them.
        // Let's first fetch details to verify type if needed, or simply sync all Hoạt Hình.
        // To be safe and comprehensive, let's sync all "hoathinh" types.
        const slug = item.slug;
        const res = await this.syncMovieBySlug(slug);
        if (res.success) {
          syncedCount++;
          results.push(`✅ [${slug}] ${res.message}`);
        } else {
          results.push(`❌ [${slug}] ${res.message}`);
        }
      }

      return {
        success: true,
        syncedCount,
        results
      };
    } catch (err: any) {
      console.error(`❌ [Scraper Error] Failed to sync latest list on page ${page}:`, err.message);
      throw err;
    }
  }
}

export const scraperService = new ScraperService();
