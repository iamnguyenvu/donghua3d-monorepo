import { Metadata, ResolvingMetadata } from 'next';
import { catalogApi } from '@/lib/api';
import EpisodeClient from './EpisodeClient';

type Props = {
  params: { slug: string; episodeNumber: string };
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const movieRes = await catalogApi.getMovie(params.slug);
  const epRes = await catalogApi.getEpisodeByNumber(params.slug, params.episodeNumber);

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
  // Fetch for JSON-LD structured data (TVEpisode)
  const movieRes = await catalogApi.getMovie(params.slug);
  const epRes = await catalogApi.getEpisodeByNumber(params.slug, params.episodeNumber);

  if (movieRes.success && movieRes.data && epRes.success && epRes.data) {
    const movie = movieRes.data;
    const episode = epRes.data;

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'TVEpisode',
      name: `Tập ${episode.episodeNumber}`,
      episodeNumber: episode.episodeNumber,
      description: episode.description,
      image: episode.thumbnail || movie.posterUrl || movie.bannerUrl,
      timeRequired: episode.duration ? `PT${Math.floor(episode.duration / 60)}M` : undefined,
      partOfSeries: {
        '@type': 'TVSeries',
        name: movie.title,
        url: `https://donghua3d.me/movies/${movie.slug || movie.id}`
      }
    };

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <EpisodeClient params={params} />
      </>
    );
  }

  // Fallback to client rendering without SEO data if fetch fails on server
  return <EpisodeClient params={params} />;
}
