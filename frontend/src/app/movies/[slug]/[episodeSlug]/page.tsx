import { Metadata } from 'next';
import { catalogApi } from '@/lib/api';
import EpisodeClient from './EpisodeClient';

type Props = {
  params: Promise<{ slug: string; episodeSlug: string }>;
};

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const { slug, episodeSlug } = await params;
  const episodeNumber = episodeSlug.replace('tap-', '');
  const movieRes = await catalogApi.getMovie(slug);
  const epRes = await catalogApi.getEpisodeByNumber(slug, episodeNumber);

  if (!movieRes.success || !movieRes.data || !epRes.success || !epRes.data) {
    return { title: 'Không tìm thấy tập phim' };
  }

  const movie = movieRes.data;
  const episode = epRes.data;
  const pageTitle = `${movie.title} Tập ${episode.episodeNumber} - Donghua3D`;
  const pageDescription = episode.description || `Xem ngay phim ${movie.title} tập ${episode.episodeNumber} chất lượng cao Full HD, vietsub tại Donghua3D.`;
  const poster = episode.thumbnail || movie.posterUrl || movie.bannerUrl;

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      images: poster ? [poster] : [],
      url: `https://donghua3d.me/movies/${movie.slug || movie.id}/tap-${episode.episodeNumber}`,
      siteName: 'Donghua3D',
      locale: 'vi_VN',
      type: 'video.episode',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: poster ? [poster] : [],
    },
    alternates: {
      canonical: `https://donghua3d.me/movies/${movie.slug || movie.id}/tap-${episode.episodeNumber}`,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug, episodeSlug } = await params;
  const episodeNumber = episodeSlug.replace('tap-', '');
  // Fetch for JSON-LD structured data (TVEpisode)
  const movieRes = await catalogApi.getMovie(slug);
  const epRes = await catalogApi.getEpisodeByNumber(slug, episodeNumber);

  if (movieRes.success && movieRes.data && epRes.success && epRes.data) {
    const movie = movieRes.data;
    const episode = epRes.data;

    const poster = episode.thumbnail || movie.posterUrl || movie.bannerUrl;
    const pageDescription = episode.description || `Xem ngay phim ${movie.title} tập ${episode.episodeNumber} chất lượng cao Full HD, vietsub tại Donghua3D.`;
    const uploadDate = movie.createdAt ? new Date(movie.createdAt).toISOString() : new Date().toISOString();

    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'TVEpisode',
        name: `Tập ${episode.episodeNumber}`,
        episodeNumber: episode.episodeNumber,
        description: pageDescription,
        image: poster,
        timeRequired: episode.duration ? `PT${Math.floor(episode.duration / 60)}M` : undefined,
        partOfSeries: {
          '@type': 'TVSeries',
          name: movie.title,
          url: `https://donghua3d.me/movies/${movie.slug || movie.id}`
        }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        name: `${movie.title} Tập ${episode.episodeNumber}`,
        description: pageDescription,
        thumbnailUrl: poster ? [poster] : [],
        uploadDate: uploadDate,
        duration: episode.duration ? `PT${Math.floor(episode.duration / 60)}M` : undefined,
        embedUrl: `https://donghua3d.me/movies/${movie.slug || movie.id}/tap-${episode.episodeNumber}`
      }
    ];

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <EpisodeClient slug={slug} episodeNumber={episodeNumber} />
      </>
    );
  }

  // Fallback to client rendering without SEO data if fetch fails on server
  return <EpisodeClient slug={slug} episodeNumber={episodeNumber} />;
}
