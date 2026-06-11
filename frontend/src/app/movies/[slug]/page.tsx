import { Metadata } from 'next';
import { catalogApi, ratingApi, ReviewPayload, MoviePayload } from '@/lib/api';
import MovieClientPage from './MovieClientPage';
import { Film } from 'lucide-react';
import Link from 'next/link';

// Use ISR with 1 hour revalidation to keep content fresh but fast
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const res = await catalogApi.getMovie(params.slug);
  if (!res.success || !res.data) {
    return {
      title: 'Không tìm thấy bộ phim | Donghua3D',
    };
  }

  const movie = res.data;
  const pageTitle = `${movie.title} - Xem Donghua 3D Vietsub Thuyết Minh | Donghua3D`;
  const pageDescription = movie.description || `Xem phim hoạt hình 3D Trung Quốc ${movie.title} Vietsub Thuyết Minh chuẩn HD, load siêu nhanh trên Donghua3D.`;
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

export default async function MoviePage({ params }: { params: { slug: string } }) {
  // Fetch data on the server
  const movieRes = await catalogApi.getMovie(params.slug);
  
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

  const [reviewRes, relatedRes] = await Promise.all([
    ratingApi.getReviews(movie.id).catch(() => ({ success: false, data: [] as ReviewPayload[], meta: { totalRatings: 0 } })),
    catalogApi.getMovies({ search: baseTitle }).catch(() => ({ success: false, data: [] as MoviePayload[] }))
  ]);

  const reviews = reviewRes.success && reviewRes.data ? reviewRes.data : [];
  const ratingCount = (reviewRes.meta?.totalRatings as number) || 0;
  
  let relatedParts: MoviePayload[] = [];
  if (relatedRes.success && relatedRes.data) {
    relatedParts = relatedRes.data.filter((m: MoviePayload) => m.id !== movie.id);
  }

  // Schema.org Structured Data
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Movie',
    name: movie.title,
    image: movie.posterUrl || movie.bannerUrl,
    description: movie.description,
    dateCreated: movie.releaseYear ? `${movie.releaseYear}` : undefined,
    director: {
      '@type': 'Organization',
      name: movie.studio || 'N/A'
    },
    aggregateRating: ratingCount > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: movie.rating,
      bestRating: '10',
      ratingCount: ratingCount
    } : undefined
  };

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
      />
    </>
  );
}
