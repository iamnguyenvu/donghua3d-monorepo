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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8">
        <Film className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-white">Không tìm thấy bộ phim</h2>
        <Link href="/" className="btn-cinema btn-cinema-primary mt-6">Quay về Trang Chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans pb-24">
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
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-transparent" />
        </div>

        <div className="relative z-10 container mx-auto px-8 max-w-6xl flex flex-col md:flex-row items-end gap-8 animate-fade-in-up">
          {/* Flat Poster Artwork card */}
          <div className="w-48 aspect-[2/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex-shrink-0 hidden md:block">
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

            <h1 className="text-3xl md:text-5xl font-extrabold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {movie.title}
            </h1>

            <div className="flex items-center gap-4 flex-wrap text-sm text-zinc-300 font-semibold mt-1">
              <span className="text-violet-400">{movie.studio}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-400">
                <Star className="w-4 h-4 fill-amber-400" />
                {movie.rating.toFixed(1)}/10
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {movie.releaseYear}
              </span>
              <span>•</span>
              <span>Tên khác: {movie.altTitles.join(', ')}</span>
            </div>

            <p className="max-w-3xl text-sm text-zinc-300 leading-relaxed truncate-3-lines" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
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
          <div className="flex items-center gap-2 border-b border-white/10 pb-4">
            <Tv className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold">Danh Sách Tập Phim</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {movie.episodes && movie.episodes.length > 0 ? (
              movie.episodes.map((ep) => (
                <Link
                  href={`/movies/${movie.id}/episodes/${ep.id}`}
                  key={ep.id}
                  className="glass-card overflow-hidden no-underline flex flex-col group/ep hover:border-violet-500/40"
                >
                  <div className="relative aspect-video w-full bg-zinc-900">
                    <Image
                      src={ep.thumbnail || movie.posterUrl || '/static/uploads/default_thumb.jpg'}
                      alt={ep.title}
                      fill
                      className="object-cover group-hover/ep:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/ep:opacity-100 transition-opacity">
                      <div className="p-3 rounded-full bg-violet-600 text-white shadow-xl">
                        <Play className="w-5 h-5 fill-white" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-1.5">
                    <span className="text-xs text-violet-400 font-bold uppercase">Tập {ep.episodeNumber}</span>
                    <h3 className="text-sm font-bold text-white group-hover/ep:text-violet-300 transition-colors truncate">
                      {ep.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate-2-lines leading-relaxed">
                      {ep.description}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 glass-card">
                <Info className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Chưa có tập phim nào được phát hành.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REVIEWS FEEDBACK & BRAND TIERS (1/3 Grid) */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Movie Leaderboard Tier Placement card */}
          {movie.leaderboard && (
            <div className="glass-card p-6 flex items-center gap-4 border-l-4 border-l-violet-500">
              <Award className="w-10 h-10 text-violet-400" />
              <div className="flex flex-col">
                <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Xếp Hạng BXH</span>
                <span className="text-lg font-bold text-white mt-0.5">Xếp Hạng {movie.leaderboard.globalTier}-TIER</span>
                <span className="text-xs text-zinc-500">Thứ hạng {movie.leaderboard.rank || 'N/A'} toàn mạng</span>
              </div>
            </div>
          )}

          {/* List verified movie reviews */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <MessageSquare className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold">Nhận Xét Từ Người Xem</h2>
            </div>

            <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev.id} className="glass-card p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10 text-xs font-bold text-white">
                          U
                        </div>
                        <span className="text-xs text-zinc-300 font-semibold truncate max-w-[120px]">{rev.user.email.split('@')[0]}</span>
                      </div>
                      <span className="bg-amber-400/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-[11px] font-extrabold flex items-center gap-0.5">
                        <Star className="w-3 h-3 fill-amber-400" />
                        {rev.value}/10
                      </span>
                    </div>
                    {rev.review && <p className="text-xs text-zinc-400 leading-relaxed">{rev.review}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 glass-card p-6">
                  <Star className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                  <p className="text-xs text-zinc-500">Chưa có nhận xét nào cho bộ phim này.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
