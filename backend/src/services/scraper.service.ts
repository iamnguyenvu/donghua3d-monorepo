import { prisma } from '../db';
import { Tier } from '@prisma/client';

function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

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

  private async fetchKKPhimEpisodes(slug: string, title?: string): Promise<any[]> {
    try {
      // 1. Try direct fetch
      const response = await fetch(`https://phimapi.com/phim/${slug}`);
      if (response.ok) {
        const data = (await response.json()) as any;
        if (data.episodes && data.episodes.length > 0) {
          return data.episodes;
        }
      }

      // 2. Try fallback search if title is provided
      if (title) {
        console.log(`🔍 [Scraper] KKPhim slug ${slug} not found. Searching by title "${title}"...`);
        const searchRes = await fetch(`https://phimapi.com/v1/api/tim-kiem?keyword=${encodeURIComponent(title)}`);
        if (searchRes.ok) {
          const searchData = (await searchRes.json()) as any;
          const items = searchData.data?.items || searchData.items || [];
          if (items.length > 0) {
            const cleanTitle = title.toLowerCase().trim();
            const matchedItem = items.find((item: any) => {
              const nameLower = (item.name || '').toLowerCase().trim();
              const originLower = (item.origin_name || '').toLowerCase().trim();
              return nameLower.includes(cleanTitle) || cleanTitle.includes(nameLower) ||
                     originLower.includes(cleanTitle) || cleanTitle.includes(originLower);
            });

            if (matchedItem && matchedItem.slug) {
              console.log(`🎯 [Scraper] Found matching KKPhim slug: "${matchedItem.slug}" for title "${title}"`);
              const fallbackResponse = await fetch(`https://phimapi.com/phim/${matchedItem.slug}`);
              if (fallbackResponse.ok) {
                const data = (await fallbackResponse.json()) as any;
                return data.episodes || [];
              }
            }
          }
        }
      }

      return [];
    } catch (e: any) {
      console.log(`⚠️ [Scraper] KKPhim fetch/fallback failed for slug ${slug}: ${e.message}`);
      return [];
    }
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

      // Parse status and totalEpisodes
      const epCurrent = (ophimMovie.episode_current || '').trim();
      let status = 'ongoing';
      let totalEpisodes: number | null = null;

      if (epCurrent.toLowerCase().includes('hoàn tất') || epCurrent.toLowerCase().includes('trọn bộ') || epCurrent.toLowerCase().includes('full')) {
        status = 'completed';
        const match = epCurrent.match(/\((\d+)\/(\d+)\)/);
        if (match) {
          totalEpisodes = parseInt(match[2], 10);
        } else {
          const numMatch = epCurrent.match(/(\d+)/);
          if (numMatch) {
            totalEpisodes = parseInt(numMatch[1], 10);
          }
        }
      } else {
        const slashMatch = epCurrent.match(/(\d+)\/(\d+)/);
        if (slashMatch) {
          totalEpisodes = parseInt(slashMatch[2], 10);
        }
      }

      if (!movie) {
        // Create new movie catalog
        console.log(`🤖 [Scraper] Movie not found. Creating catalog: "${normalizedTitle}"...`);
        movie = await prisma.movie.create({
          data: {
            title: normalizedTitle,
            slug: ophimMovie.slug || slugify(normalizedTitle),
            altTitles: [ophimMovie.origin_name, ...(ophimMovie.sub_doc ? [ophimMovie.sub_doc] : [])],
            description: cleanDesc,
            releaseYear,
            posterUrl,
            bannerUrl,
            studio: this.guessStudio(normalizedTitle, ophimMovie.origin_name),
            rating: 0.0, // Start with honest 0.0 until rated by community
            expertRating: 0.0,
            audienceRating: 0.0,
            imdbRating: ophimMovie.imdb_rating ? parseFloat(ophimMovie.imdb_rating) : null,
            status,
            totalEpisodes
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
            tierScore: 0.0,
            globalTier: Tier.C // Neutral default C-Tier until ranked by community
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
            status,
            totalEpisodes,
            updatedAt: new Date()
          }
        });
      }

      // Sync Genres (Extract from ophimMovie.category if available)
      if (ophimMovie.category && Array.isArray(ophimMovie.category)) {
        for (const cat of ophimMovie.category) {
          if (cat.name && cat.slug) {
            // Upsert Genre
            const genre = await prisma.genre.upsert({
              where: { slug: cat.slug },
              update: { name: cat.name },
              create: { name: cat.name, slug: cat.slug }
            });

            // Link to Movie (Upserting MovieGenre)
            await prisma.movieGenre.upsert({
              where: {
                movieId_genreId: {
                  movieId: movie.id,
                  genreId: genre.id
                }
              },
              update: {},
              create: {
                movieId: movie.id,
                genreId: genre.id
              }
            });
          }
        }
      }

      // Sync/Upsert Episodes
      let syncedEpisodesCount = 0;
      if (data.episodes && data.episodes.length > 0) {
        console.log(`🤖 [Scraper] Syncing episodes across ${data.episodes.length} servers...`);
        const allEpsMap = new Map<number, any>();

        for (const server of data.episodes) {
          const serverName = server.server_name;
          for (const ep of server.server_data) {
            const cleanName = (ep.name || '').trim();
            const rangeMatch = cleanName.match(/^(\d+)-(\d+)$/);
            let epNumbers: number[] = [];

            if (rangeMatch) {
              const start = parseInt(rangeMatch[1], 10);
              const end = parseInt(rangeMatch[2], 10);
              if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let num = start; num <= end; num++) {
                  epNumbers.push(num);
                }
              }
            } else {
              const numMatch = cleanName.match(/\d+/);
              if (numMatch) {
                const episodeNumber = parseInt(numMatch[0], 10);
                if (!isNaN(episodeNumber)) {
                  epNumbers.push(episodeNumber);
                }
              }
            }

            const videoUrl = ep.link_m3u8 || ep.link_embed;
            if (!videoUrl || epNumbers.length === 0) continue;

            for (const episodeNumber of epNumbers) {
              if (!allEpsMap.has(episodeNumber)) {
                allEpsMap.set(episodeNumber, {
                  episodeNumber,
                  filename: ep.filename,
                  sources: []
                });
              }
              const exists = allEpsMap.get(episodeNumber).sources.some(
                (s: any) => s.serverName === serverName && s.videoUrl === videoUrl
              );
              if (!exists) {
                allEpsMap.get(episodeNumber).sources.push({ serverName, videoUrl });
              }
            }
          }
        }

        // Sync KKPhim episodes as well if available
        const kkEpisodes = await this.fetchKKPhimEpisodes(slug, movie.title);
        if (kkEpisodes && kkEpisodes.length > 0) {
          console.log(`🤖 [Scraper] Merging KKPhim episodes...`);
          for (const server of kkEpisodes) {
            const serverName = `KKPhim - ${server.server_name}`;
            for (const ep of server.server_data) {
              const cleanName = (ep.name || '').trim();
              const rangeMatch = cleanName.match(/^(\d+)-(\d+)$/);
              let epNumbers: number[] = [];

              if (rangeMatch) {
                const start = parseInt(rangeMatch[1], 10);
                const end = parseInt(rangeMatch[2], 10);
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                  for (let num = start; num <= end; num++) {
                    epNumbers.push(num);
                  }
                }
              } else {
                const numMatch = cleanName.match(/\d+/);
                if (numMatch) {
                  const episodeNumber = parseInt(numMatch[0], 10);
                  if (!isNaN(episodeNumber)) {
                    epNumbers.push(episodeNumber);
                  }
                }
              }

              const videoUrl = ep.link_m3u8 || ep.link_embed;
              if (!videoUrl || epNumbers.length === 0) continue;

              for (const episodeNumber of epNumbers) {
                if (!allEpsMap.has(episodeNumber)) {
                  allEpsMap.set(episodeNumber, {
                    episodeNumber,
                    filename: ep.filename,
                    sources: []
                  });
                }
                const alreadyHas = allEpsMap.get(episodeNumber).sources.some(
                  (s: any) => s.serverName === serverName || s.videoUrl === videoUrl
                );
                if (!alreadyHas) {
                  allEpsMap.get(episodeNumber).sources.push({ serverName, videoUrl });
                }
              }
            }
          }
        }

        // Clear all existing sources for this movie's episodes to ensure a clean sync
        await prisma.episodeSource.deleteMany({
          where: {
            episode: {
              movieId: movie.id
            }
          }
        });

        for (const epData of allEpsMap.values()) {
          const { episodeNumber, filename, sources } = epData;

          let cleanEpTitle = filename || `Tập ${episodeNumber}`;
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

          let existingEp = await prisma.episode.findUnique({
            where: {
              unique_movie_episode: {
                movieId: movie.id,
                episodeNumber
              }
            }
          });

          const primaryVideoUrl = sources[0].videoUrl;

          if (!existingEp) {
            existingEp = await prisma.episode.create({
              data: {
                movieId: movie.id,
                episodeNumber,
                title: cleanEpTitle,
                description: `Tập phim thứ ${episodeNumber} của bộ phim ${movie.title}`,
                videoUrl: primaryVideoUrl,
                duration: 1200.0,
                thumbnail: movie.bannerUrl
              }
            });
          } else {
            existingEp = await prisma.episode.update({
              where: { id: existingEp.id },
              data: {
                videoUrl: primaryVideoUrl,
                title: cleanEpTitle
              }
            });
          }

          for (let i = 0; i < sources.length; i++) {
            const source = sources[i];
            const priority = sources.length - i;
            const existingSource = await prisma.episodeSource.findFirst({
              where: { episodeId: existingEp.id, serverName: source.serverName }
            });

            if (!existingSource) {
              await prisma.episodeSource.create({
                data: {
                  episodeId: existingEp.id,
                  serverName: source.serverName,
                  videoUrl: source.videoUrl,
                  priority
                }
              });
            } else {
              await prisma.episodeSource.update({
                where: { id: existingSource.id },
                data: { videoUrl: source.videoUrl, priority }
              });
            }
          }

          syncedEpisodesCount++;
        }
      }

      if (syncedEpisodesCount > 0) {
        await prisma.movie.update({
          where: { id: movie.id },
          data: { updatedAt: new Date() }
        });
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
  async syncLatestHoathinh(
    page: number = 1,
    onlyExisting: boolean = false
  ): Promise<{ success: boolean; syncedCount: number; results: string[] }> {
    try {
      console.log(`🤖 [Scraper] Syncing latest updated movies page ${page} (onlyExisting: ${onlyExisting})...`);
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
        const slug = item.slug;

        if (onlyExisting) {
          const normalizedTitle = normalizeMovieTitle(item.name, slug);
          const existingMovie = await prisma.movie.findFirst({
            where: {
              OR: [
                { title: normalizedTitle },
                { title: item.origin_name }
              ]
            }
          });

          if (!existingMovie) {
            console.log(`⏭️ [Scraper] Bỏ qua phim mới slug "${slug}" (Không tồn tại trong DB, tránh cào phim rác)`);
            results.push(`⏭️ [${slug}] Bỏ qua (Phim không tồn tại trong database)`);
            continue;
          }
        }

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
