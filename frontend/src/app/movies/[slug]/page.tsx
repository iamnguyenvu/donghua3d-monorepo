import { Metadata } from 'next';
import { catalogApi, ratingApi, ReviewPayload, MoviePayload } from '@/lib/api';
import MovieClientPage from './MovieClientPage';
import { Film } from 'lucide-react';
import Link from 'next/link';

// Use ISR with 5 minutes revalidation to keep content fresh but fast
export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const res = await catalogApi.getMovie(slug);
  if (!res.success || !res.data) {
    return {
      title: 'Không tìm thấy bộ phim | Donghua3D',
    };
  }

  const movie = res.data;
  
  let latestEpisodeNumber = 0;
  if (movie.episodes && Array.isArray(movie.episodes) && movie.episodes.length > 0) {
    latestEpisodeNumber = Math.max(...movie.episodes.map((ep) => ep.episodeNumber));
  }

  const pageTitle = latestEpisodeNumber > 0 
    ? `${movie.title} Tập ${latestEpisodeNumber} [Vietsub 4K] | Donghua3D` 
    : `${movie.title} - Xem Donghua 3D Vietsub Thuyết Minh | Donghua3D`;

  const shortDesc = movie.description ? movie.description.substring(0, 120) + '...' : '';
  const pageDescription = `Xem phim hoạt hình 3D Trung Quốc ${movie.title} ${latestEpisodeNumber > 0 ? `Tập ${latestEpisodeNumber}` : ''} Vietsub Thuyết Minh chuẩn HD 4K, load siêu nhanh. ${shortDesc}`;
  
  const poster = movie.posterUrl || movie.bannerUrl || 'https://donghua3d.me/static/uploads/default_poster.jpg';

  return {
    title: pageTitle,
    description: pageDescription,
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: `https://donghua3d.me/movies/${movie.slug || movie.id}`,
      siteName: 'Donghua3D',
      images: [
        {
          url: poster,
          width: 800,
          height: 600,
          alt: movie.title,
        },
      ],
      locale: 'vi_VN',
      type: 'video.movie',
    },
    twitter: {
      card: 'summary_large_image',
      title: pageTitle,
      description: pageDescription,
      images: [poster],
    },
    alternates: {
      canonical: `https://donghua3d.me/movies/${movie.slug || movie.id}`,
    },
  };
}

export default async function MoviePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Fetch data on the server
  const movieRes = await catalogApi.getMovie(slug);
  
  if (!movieRes.success || !movieRes.data) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 select-none text-center">
        <Film className="w-10 h-10 text-violet-500 mb-4 animate-bounce" />
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Không tìm thấy bộ phim</h2>
        <Link href="/" className="mt-5 px-5 py-2.5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-xs font-extrabold uppercase tracking-wider text-white no-underline transition-all">Quay về Trang Chủ</Link>
      </div>
    );
  }

  const movie = movieRes.data;

  // Parallel fetch for reviews and related parts to speed up SSR
  const baseTitle = movie.title
    .replace(/(phần\s+\d+|season\s+\d+|\s+p\d+|\s+part\s+\d+|\s+\d+)/gi, '')
    .replace(/\s*:\s*.*/, '')
    .replace(/\s*\(.*\)/, '')
    .trim();

  const [reviewRes, relatedRes, similarRes] = await Promise.all([
    ratingApi.getReviews(movie.id).catch(() => ({ success: false, data: [] as ReviewPayload[], meta: { totalRatings: 0 } })),
    catalogApi.getMovies({ search: baseTitle }).catch(() => ({ success: false, data: [] as MoviePayload[] })),
    catalogApi.getSimilarMovies(movie.id).catch(() => ({ success: false, data: [] as MoviePayload[] }))
  ]);

  const reviews = reviewRes.success && reviewRes.data ? reviewRes.data : [];
  const ratingCount = (reviewRes.meta?.totalRatings as number) || 0;
  
  let relatedParts: MoviePayload[] = [];
  if (relatedRes.success && relatedRes.data) {
    relatedParts = relatedRes.data.filter((m: MoviePayload) => m.id !== movie.id);
  }

  const similarMovies = similarRes.success && similarRes.data ? similarRes.data : [];

  // Schema.org Structured Data (TVSeries)
  const episodeCount = movie.episodes ? movie.episodes.length : 0;
  
  const uploadDate = movie.createdAt ? new Date(movie.createdAt).toISOString() : new Date().toISOString();

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      name: movie.title,
      alternativeHeadline: movie.altTitles?.join(', '),
      image: movie.posterUrl || movie.bannerUrl,
      description: movie.description,
      dateCreated: movie.releaseYear ? `${movie.releaseYear}` : undefined,
      numberOfEpisodes: episodeCount > 0 ? episodeCount : undefined,
      productionCompany: {
        '@type': 'Organization',
        name: movie.studio || 'N/A'
      },
      aggregateRating: ratingCount > 0 ? {
        '@type': 'AggregateRating',
        ratingValue: movie.rating > 0 ? movie.rating : 8.5,
        bestRating: '10',
        ratingCount: ratingCount
      } : undefined
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: movie.title,
      image: [movie.posterUrl || movie.bannerUrl || ''],
      datePublished: uploadDate,
      dateModified: uploadDate,
      author: [{
          '@type': 'Organization',
          name: 'Donghua3D',
          url: 'https://donghua3d.me'
      }]
    }
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MovieClientPage 
        movie={movie} 
        reviews={reviews} 
        ratingCount={ratingCount} 
        relatedParts={relatedParts} 
        similarMovies={similarMovies}
      />
    </>
  );
}
