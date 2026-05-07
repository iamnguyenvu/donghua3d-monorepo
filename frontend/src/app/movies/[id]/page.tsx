'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { 
  Star, Play, Calendar, Film, ArrowLeft, Loader2, Award, 
  Tv, MessageSquare, Info 
} from 'lucide-react';
import Header from '@/components/Header';
import { catalogApi, ratingApi, MovieWithEpisodes, ReviewPayload } from '@/lib/api';

export default function MovieDetails() {
  const params = useParams() as { id: string };
  const [movie, setMovie] = useState<MovieWithEpisodes | null>(null);
  const [reviews, setReviews] = useState<ReviewPayload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMovieData() {
      setLoading(true);
      const res = await catalogApi.getMovie(params.id);
      if (res.success && res.data) {
        setMovie(res.data);
        
        const reviewRes = await ratingApi.getReviews(params.id);
        if (reviewRes.success && reviewRes.data) {
          setReviews(reviewRes.data);
        }
      } else {
        // Mock fallback data matching our pre-seeded catalog for instant local presentation
        const mockEpisodes = [
          {
            id: 'ep1',
            movieId: params.id,
            episodeNumber: 1,
            title: 'Quyết chiến Thạch Thôn',
            description: 'Trận chiến mở màn khốc liệt bảo vệ Thạch Thôn khỏi lũ ác thú dị dị cổ đại.',
            videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            duration: 1200.0,
            introStart: 10,
            introEnd: 90,
            outroStart: 1100,
            outroEnd: 1200,
            thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60'
          },
          {
            id: 'ep2',
            movieId: params.id,
            episodeNumber: 2,
            title: 'Vào Đại Hoang',
            description: 'Thạch Hạo bước ra hoang dã tìm kiếm phương thuốc hồi sinh cho Thần Liễu.',
            videoUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
            duration: 1180.0,
            introStart: 15,
            introEnd: 105,
            outroStart: 1080,
            outroEnd: 1180,
            thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60'
          }
        ];

        setMovie({
          id: params.id,
          title: 'Perfect World (Thế Giới Hoàn Mỹ)',
          altTitles: ['完美世界', 'Perfect World'],
          description: 'Trong hoang dã bao la vô tận, Thạch Hạo đứng dậy chinh phục vạn tộc, chiến đấu sinh tử để bứt phá thiên địa cực hạn phong thần tu chân tiên.',
          studio: 'Foch Film',
          releaseYear: 2021,
          posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
          bannerUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&auto=format&fit=crop&q=60',
          rating: 9.2,
          expertRating: 9.4,
          audienceRating: 9.0,
          createdAt: new Date().toISOString(),
          leaderboard: { globalTier: 'S' as any, tierScore: 94.5, rank: 1 },
          episodes: mockEpisodes
        });
      }
      setLoading(false);
    }
    loadMovieData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8">
        <Film className="w-12 h-12 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-xl font-bold text-white">Không tìm thấy bộ phim</h2>
        <Link href="/" className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full text-white font-bold mt-6 hover:scale-105 active:scale-95 transition-all">Quay về Trang Chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header />

      {/* ==============================================================================
         MOVIE METADATA HERO HEADER
         ============================================================================== */}
      <section className="relative w-full h-[60vh] flex items-end pb-12 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src={movie.bannerUrl || movie.posterUrl || ''}
            alt={movie.title}
            fill
            priority
            className="object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-8 max-w-6xl flex flex-col md:flex-row items-end gap-8 animate-fade-in-up">
          {/* Flat Poster Artwork card */}
          <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl flex-shrink-0 hidden md:block">
            <Image
              src={movie.posterUrl || '/static/uploads/default_poster.jpg'}
              alt={movie.title}
              width={192}
              height={288}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details Metadata panel */}
          <div className="flex-grow flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white no-underline text-xs font-semibold uppercase tracking-wider mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại danh mục chính
            </Link>

            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-tight" style={{ textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
              {movie.title}
            </h1>

            <div className="flex items-center gap-4 flex-wrap text-sm text-zinc-300 font-semibold mt-1">
              <span className="text-violet-400 font-bold tracking-wider uppercase">{movie.studio}</span>
              <span className="text-zinc-700">•</span>
              {movie.rating > 0 ? (
                <span className="flex items-center gap-1.5 text-amber-400 bg-amber-400/5 px-2.5 py-0.5 rounded-lg border border-amber-400/20">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  {movie.rating.toFixed(1)}/10
                </span>
              ) : (
                <span className="text-[10px] bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2.5 py-0.5 rounded-lg font-extrabold uppercase">Full HD 1080P</span>
              )}
              <span className="text-zinc-700">•</span>
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Calendar className="w-4 h-4 text-zinc-400" />
                {movie.releaseYear}
              </span>
              <span className="text-zinc-700">•</span>
              <span className="text-zinc-400">Tên khác: <span className="text-zinc-200 font-medium">{movie.altTitles.join(', ')}</span></span>
            </div>

            <p className="max-w-3xl text-sm text-zinc-300 leading-relaxed truncate-3-lines" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {movie.description}
            </p>
          </div>
        </div>
      </section>

      {/* ==============================================================================
         EPISODES AND REVIEWS INFORMATION SECTIONS
         ============================================================================== */}
      <main className="container mx-auto px-8 max-w-6xl mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* LEFT COLUMN: LIST OF EPISODES (2/3 Grid) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-2.5 border-b border-zinc-800/80 pb-4">
            <Tv className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">Danh Sách Tập Phim</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {movie.episodes && movie.episodes.length > 0 ? (
              movie.episodes.map((ep) => (
                <Link
                  href={`/movies/${movie.id}/episodes/${ep.id}`}
                  key={ep.id}
                  className="bg-zinc-950/60 border border-zinc-800/60 hover:border-violet-500/40 rounded-2xl overflow-hidden flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-video w-full bg-zinc-900">
                    <Image
                      src={ep.thumbnail || movie.posterUrl || '/static/uploads/default_thumb.jpg'}
                      alt={ep.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-3.5 rounded-full bg-violet-600 text-white shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-1.5">
                    <span className="text-xs text-violet-400 font-bold uppercase tracking-wider">Tập {ep.episodeNumber}</span>
                    <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate">
                      {ep.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate-2-lines leading-relaxed">
                      {ep.description}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 bg-zinc-950/40 border border-zinc-800 rounded-2xl p-6">
                <Info className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500 italic">Chưa có tập phim nào được phát hành.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REVIEWS FEEDBACK & BRAND TIERS (1/3 Grid) */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Movie Leaderboard Tier Placement card */}
          {movie.leaderboard && (
            <div className="p-6 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl flex items-center gap-4 border-l-4 border-l-violet-500 shadow-md">
              <Award className="w-10 h-10 text-violet-400 animate-pulse-glow" />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Xếp Hạng BXH</span>
                <span className="text-lg font-bold text-white mt-0.5">Xếp Hạng {movie.leaderboard.globalTier}-TIER</span>
                <span className="text-xs text-zinc-500">Thứ hạng {movie.leaderboard.rank || 'N/A'} toàn mạng</span>
              </div>
            </div>
          )}

          {/* List verified movie reviews */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-4">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Nhận Xét Từ Người Xem</h2>
            </div>

            <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-4 bg-zinc-950/80 border border-zinc-800/80 rounded-xl flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-xs font-bold text-white">
                          U
                        </div>
                        <span className="text-xs text-zinc-300 font-semibold truncate max-w-[120px]">{rev.user.email.split('@')[0]}</span>
                      </div>
                      <span className="bg-amber-400/5 border border-amber-500/20 text-amber-400 px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold flex items-center gap-0.5 shadow-sm">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {rev.value}/10
                      </span>
                    </div>
                    {rev.review && <p className="text-xs text-zinc-400 leading-relaxed">{rev.review}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-zinc-950/40 border border-zinc-800 rounded-xl p-6">
                  <Star className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500 italic">Chưa có nhận xét nào cho bộ phim này.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
