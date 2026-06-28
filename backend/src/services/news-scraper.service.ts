import { prisma } from '../db';

// Curated mock backup news articles to ensure the news section is always seeded with beautiful, relevant content
const BACKUP_NEWS_ARTICLES = [
  {
    title: 'Phàm Nhân Tu Tiên chuẩn bị ra mắt phần tiếp theo: Cục diện Loạn Tinh Hải trở nên gay cấn',
    summary: 'Hành trình của Hàn Lập tại Loạn Tinh Hải chuẩn bị bước sang một chương mới với việc xuất hiện của các cao thủ Nguyên Anh Kỳ và tranh giành Hư Thiên Đỉnh.',
    content: 'Đơn vị sản xuất Original Force vừa công bố loạt tạo hình nhân vật mới cho phần tiếp theo của loạt phim Phàm Nhân Tu Tiên. Theo tiết lộ từ đạo diễn, phần phim này sẽ tập trung vào sự kiện tranh đoạt Hư Thiên Đỉnh - một trong những bảo vật thượng cổ quyền năng nhất Loạn Tinh Hải. Hàn Lập với lối tu hành thận trọng quen thuộc sẽ phải đối phó với cả Ma đạo và Chính đạo tông môn. Kỹ thuật đồ họa Unreal Engine 5 cải tiến hứa hẹn đem lại những phân cảnh chiến đấu mãn nhãn và chân thực hơn bao giờ hết.',
    imageUrl: 'https://cdn.hoathinh3d.co/uploads/banners/perfect-world-banner.jpg', // Safe image URLs that load properly
    sourceUrl: 'https://bilibili.com',
    author: 'Tông Môn Biên Tập'
  },
  {
    title: 'Thế Giới Hoàn Mỹ đột phá mốc 150 tập: Thạch Hạo đại chiến Thượng Giới chư thiên',
    summary: 'Bộ hoạt hình 3D ăn khách Thế Giới Hoàn Mỹ đạt cột mốc ấn tượng, mở ra cuộc hành trình Thạch Hạo tiến vào Thượng Giới đầy rẫy hiểm nguy và đại ngộ.',
    content: 'Thế Giới Hoàn Mỹ đã chính thức vượt qua cột mốc 150 tập phát sóng liên tục. Phim hiện tại đang tiến vào giai đoạn cao trào nhất khi Hoang Thiên Đế Thạch Hạo bắt đầu phi thăng tiến vào Thượng Giới. Tại đây, Thạch Hạo sẽ đối đầu với vô số thiên tài từ các đại giáo cổ xưa và chư thiên thần linh. Tốc độ khung hình mượt mà và kỹ xảo ánh sáng tím neon đỉnh cao từ Foch Film tiếp tục khẳng định vị thế dẫn đầu trong dòng phim hoạt hình 3D tiên hiệp.',
    imageUrl: 'https://cdn.hoathinh3d.co/uploads/banners/perfect-world-banner.jpg',
    sourceUrl: 'https://tencent.com',
    author: 'Động Phủ Tin Tức'
  },
  {
    title: 'Đại Đạo Triều Thiên lọt top những tác phẩm hoạt hình 3D đáng xem nhất năm 2026',
    summary: 'Tác phẩm chuyển thể từ tiểu thuyết võ hiệp cùng tên của Miêu Nị nhận được vô vàn lời khen nhờ cốt truyện triết lý sâu sắc và đồ họa độc đáo.',
    content: 'Đại Đạo Triều Thiên của tác giả Miêu Nị đã được Bilibili Pictures chuyển thể vô cùng xuất sắc. Với nhân vật chính Tỉnh Cửu mang tính cách lười biếng đặc trưng nhưng sở hữu kiếm đạo tuyệt đỉnh, tác phẩm mang lại một làn gió mới hoàn toàn so với các mô-típ tu tiên truyền thống. Bố cục phim tinh tế, màu sắc pha trộn giữa trường phái mực tàu truyền thống và hiệu ứng đổ bóng 3D hiện đại tạo nên tính nghệ thuật vượt trội.',
    imageUrl: 'https://cdn.hoathinh3d.co/uploads/posters/dai-dao-trieu-thien.jpg',
    sourceUrl: 'https://bilibili.com',
    author: 'Tỉnh Cửu Kiếm Đạo'
  }
];

export class NewsScraperService {
  /**
   * Safe slug generator
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accent marks
      .replace(/[đĐ]/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '') // remove spec characters
      .trim()
      .replace(/\s+/g, '-');
  }

  /**
   * Fetches RSS feed or falls back to local curated database seeds
   */
  async syncNewsFromFeed(): Promise<{ success: boolean; count: number; message: string }> {
    console.log('📰 [News Scraper] Starting RSS Feed news sync...');
    let articlesToSave = [...BACKUP_NEWS_ARTICLES];
    let sourceUsed = 'Mock Backup Data';

    try {
      // Fetch news from AnimeNewsNetwork action genre news RSS feed
      // Using global native fetch with a 6-second timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('https://www.animenewsnetwork.com/news/rss.xml?ann-genre=action', {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Donghua3DNewsScraper/1.0' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const xml = await response.text();
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        const parsedArticles: typeof BACKUP_NEWS_ARTICLES = [];

        while ((match = itemRegex.exec(xml)) !== null) {
          const itemContent = match[1];

          // Extract title, link, description, and date using regex to avoid external dependency issues
          const titleMatch = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title>([\s\S]*?)<\/title>/);
          const linkMatch = itemContent.match(/<link>([\s\S]*?)<\/link>/);
          const descMatch = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/);
          
          const rawTitle = titleMatch ? (titleMatch[1] || titleMatch[2]) : '';
          const link = linkMatch ? linkMatch[1] : '';
          const desc = descMatch ? (descMatch[1] || descMatch[2]) : '';

          if (rawTitle && link) {
            // Normalize CDATA wrap or raw HTML codes
            const title = rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/<\/?[^>]+(>|$)/g, "");
            const summary = desc.replace(/<\/?[^>]+(>|$)/g, "").slice(0, 200) + '...';
            const content = desc.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

            parsedArticles.push({
              title: `[ANN] ${title}`,
              summary,
              content: `${content}<br/><br/><i>Đọc bài viết gốc tại: <a href="${link}" target="_blank" rel="noopener noreferrer">${link}</a></i>`,
              imageUrl: 'https://cdn.hoathinh3d.co/uploads/banners/perfect-world-banner.jpg',
              sourceUrl: link,
              author: 'Anime News Network'
            });
          }

          if (parsedArticles.length >= 5) break; // Limit to 5 fresh articles per crawl
        }

        if (parsedArticles.length > 0) {
          articlesToSave = parsedArticles;
          sourceUsed = 'AnimeNewsNetwork RSS Feed';
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ [News Scraper] Network request to RSS feed failed (${err.message}). Falling back to curated mock news.`);
    }

    let savedCount = 0;
    for (const article of articlesToSave) {
      const slug = this.generateSlug(article.title);

      try {
        // Upsert into Database (avoids inserting duplicates by using slug as constraint)
        await prisma.news.upsert({
          where: { slug },
          update: {
            summary: article.summary,
            content: article.content,
            imageUrl: article.imageUrl,
            sourceUrl: article.sourceUrl,
          },
          create: {
            title: article.title,
            slug,
            summary: article.summary,
            content: article.content,
            imageUrl: article.imageUrl,
            sourceUrl: article.sourceUrl,
            author: article.author
          }
        });
        savedCount++;
      } catch (dbErr: any) {
        console.error(`💥 [News Scraper DB Error] Failed to save article "${article.title}":`, dbErr.message);
      }
    }

    console.log(`📰 [News Scraper] Synced ${savedCount} articles successfully from ${sourceUsed}.`);
    return {
      success: true,
      count: savedCount,
      message: `Đã đồng bộ thành công ${savedCount} tin tức từ nguồn: ${sourceUsed}.`
    };
  }
}

export const newsScraperService = new NewsScraperService();
