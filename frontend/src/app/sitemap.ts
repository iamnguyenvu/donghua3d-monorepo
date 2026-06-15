import type { MetadataRoute } from 'next';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const SITE_URL = 'https://donghua3d.me';

interface SitemapMovie {
  id: string;
  title?: string;
  slug?: string;
  updatedAt?: string;
  episodes?: { episodeNumber: number; createdAt: string }[];
}

interface SitemapGenre {
  slug: string;
}

async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE_URL}/leaderboard`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/genres`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
  ];

  // Movie & Episode pages via sitemap-data
  const movies = await fetchJson<SitemapMovie[]>('/catalog/sitemap-data');
  if (movies) {
    for (const movie of movies) {
      const movieUrl = `${SITE_URL}/movies/${movie.slug || movie.id}`;
      
      // Add Movie page
      entries.push({
        url: movieUrl,
        lastModified: movie.updatedAt ? new Date(movie.updatedAt) : new Date(),
        changeFrequency: 'weekly',
        priority: 0.8,
      });

      // Add Episode pages
      if (movie.episodes && movie.episodes.length > 0) {
        for (const ep of movie.episodes) {
          entries.push({
            url: `${movieUrl}/tap-${ep.episodeNumber}`,
            lastModified: ep.createdAt ? new Date(ep.createdAt) : new Date(),
            changeFrequency: 'weekly',
            priority: 0.9, // Higher priority for episode pages
          });
        }
      }
    }
  }

  // Genre pages
  const genres = await fetchJson<SitemapGenre[]>('/genres');
  if (genres) {
    for (const genre of genres) {
      entries.push({
        url: `${SITE_URL}/genres/${genre.slug}`,
        changeFrequency: 'weekly',
        priority: 0.5,
      });
    }
  }

  return entries;
}
