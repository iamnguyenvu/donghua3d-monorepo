'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { 
  Star, Play, Calendar, Film, ArrowLeft, Loader2, Award, 
  Tv, MessageSquare, Info, Plus, Check 
} from 'lucide-react';
import Header from '@/components/Header';
import { catalogApi, ratingApi, MovieWithEpisodes, ReviewPayload, watchlistApi } from '@/lib/api';

export default function MovieDetails() {
  const params = useParams() as { id: string };
  const [movie, setMovie] = useState<MovieWithEpisodes | null>(null);
  const [reviews, setReviews] = useState<ReviewPayload[]>([]);
  const [loading, setLoading] = useState(true);

  // Watchlist integration
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [watchlistActionLoading, setWatchlistActionLoading] = useState(false);

  useEffect(() => {
    async function loadWatchlist() {
      const token = localStorage.getItem('donghua3d_token');
      if (token) {
        const res = await watchlistApi.getWatchlist();
        if (res.success && res.data) {
          setWatchlistIds(new Set(res.data.map((m) => m.id)));
        }
      }
    }
    loadWatchlist();
  }, []);

  const toggleWatchlist = async (movieId: string) => {
    const token = localStorage.getItem('donghua3d_token');
    if (!token) {
      alert('Vui lòng đăng nhập để lưu phim vào danh sách.');
      return;
    }

    setWatchlistActionLoading(true);
    try {
      if (watchlistIds.has(movieId)) {
        const res = await watchlistApi.removeFromWatchlist(movieId);
        if (res.success) {
          setWatchlistIds((prev) => {
            const next = new Set(prev);
            next.delete(movieId);
            return next;
          });
        }
      } else {
        const res = await watchlistApi.addToWatchlist(movieId);
        if (res.success) {
          setWatchlistIds((prev) => {
            const next = new Set(prev);
            next.add(movieId);
            return next;
          });
        }
      }
    } catch (err) {
      console.error('Failed to toggle watchlist:', err);
    } finally {
      setWatchlistActionLoading(false);
    }
  };

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
      <div className="min-h-screen bg-[#050508] flex flex-col items-center justify-center p-8 select-none text-center">
        <Film className="w-10 h-10 text-violet-500 mb-4 animate-bounce" />
        <h2 className="text-base font-bold text-white uppercase tracking-wider">Không tìm thấy bộ phim</h2>
        <Link href="/" className="mt-5 px-5 py-2.5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-xs font-extrabold uppercase tracking-wider text-white no-underline transition-all">Quay về Trang Chủ</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header />

      {/* ==============================================================================
         MOVIE METADATA HERO HEADER (Layout 02 Netflix Style)
         ============================================================================== */}
      <section className="relative w-full h-[55vh] flex items-end pb-10 overflow-hidden border-b border-zinc-900/40">
        <div className="absolute inset-0 z-0">
          <Image
            src={movie.bannerUrl || movie.posterUrl || ''}
            alt={movie.title}
            fill
            priority
            className="object-cover opacity-35 scale-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/40 to-transparent" />
        </div>

        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex flex-col md:flex-row items-end gap-6 animate-fade-in-up">
          {/* Flat Poster Artwork card */}
          <div className="w-40 aspect-[2/3] rounded-[4px] overflow-hidden border border-zinc-900/60 shadow-2xl flex-shrink-0 hidden md:block">
            <Image
              src={movie.posterUrl || '/static/uploads/default_poster.jpg'}
              alt={movie.title}
              width={160}
              height={240}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details Metadata panel */}
          <div className="flex-grow flex flex-col gap-3.5">
            <Link href="/" className="flex items-center gap-1.5 text-zinc-400 hover:text-white no-underline text-[10px] font-bold uppercase tracking-wider mb-1 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại danh mục chính
            </Link>

            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight uppercase" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
              {movie.title}
            </h1>

            {/* Premium Pill Metadata Grid */}
            <div className="flex items-center gap-2 flex-wrap select-none">
              <span className="border border-zinc-800 bg-zinc-950/60 text-violet-400 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
                {movie.studio}
              </span>
              <span className="border border-zinc-800 bg-zinc-950/60 text-amber-400 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
                ⭐ {movie.rating > 0 ? movie.rating.toFixed(1) : '9.0'} / 10
              </span>
              <span className="border border-zinc-800 bg-zinc-950/60 text-zinc-300 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
                {movie.releaseYear}
              </span>
              <span className="border border-zinc-800 bg-zinc-950/60 text-zinc-300 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
                FULL HD 1080P
              </span>
              <span className="border border-zinc-800 bg-zinc-950/60 text-zinc-300 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
                HLS H.264
              </span>
              <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider ml-2 hidden sm:inline">
                Tên khác: <span className="text-zinc-300">{movie.altTitles[0] || 'N/A'}</span>
              </span>
            </div>

            <p className="max-w-2xl text-xs md:text-sm text-zinc-400 leading-relaxed truncate-3-lines" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
              {movie.description}
            </p>

            {/* Premium Interactive Action CTA Bar */}
            <div className="flex items-center gap-3.5 mt-2.5 flex-wrap">
              {movie.episodes && movie.episodes.length > 0 ? (
                <Link
                  href={`/movies/${movie.id}/episodes/${movie.episodes[0].id}`}
                  className="px-6 py-3.5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-extrabold flex items-center gap-2 text-[11px] uppercase tracking-wider transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_25px_rgba(124,58,237,0.5)] border-0 outline-none no-underline"
                >
                  <Play className="w-4 h-4 fill-white text-white" />
                  Phát Tập 1
                </Link>
              ) : (
                <button
                  disabled
                  className="px-6 py-3.5 rounded-[4px] bg-zinc-900 border border-zinc-850 text-zinc-660 font-extrabold flex items-center gap-2 text-[11px] uppercase tracking-wider select-none opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Sắp Ra Mắt
                </button>
              )}

              <button
                onClick={() => toggleWatchlist(movie.id)}
                disabled={watchlistActionLoading}
                className="px-6 py-3.5 rounded-[4px] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-extrabold flex items-center gap-2 text-[11px] uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer outline-none"
              >
                {watchlistActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : watchlistIds.has(movie.id) ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    Trong danh sách
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-white" />
                    Danh sách của tôi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ==============================================================================
         EPISODES AND REVIEWS INFORMATION SECTIONS
         ============================================================================== */}
      <main className="w-full px-6 md:px-12 lg:px-16 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* LEFT COLUMN: LIST OF EPISODES (2/3 Grid) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-4">
            <h2 className="text-base font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3">
              Danh Sách Tập Phim
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {movie.episodes && movie.episodes.length > 0 ? (
              movie.episodes.map((ep) => (
                <Link
                  href={`/movies/${movie.id}/episodes/${ep.id}`}
                  key={ep.id}
                  className="bg-[#0c0c0f]/40 border border-zinc-900/60 hover:border-zinc-800 rounded-[4px] overflow-hidden flex flex-col group transition-all duration-300 shadow-md no-underline"
                >
                  <div className="relative aspect-video w-full bg-zinc-950">
                    <Image
                      src={ep.thumbnail || movie.posterUrl || '/static/uploads/default_thumb.jpg'}
                      alt={ep.title}
                      fill
                      className="object-cover transition-transform duration-550 group-hover:scale-103"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="p-2.5 rounded-[4px] bg-violet-600 text-white shadow-2xl scale-95 group-hover:scale-100 transition-all duration-200">
                        <Play className="w-3.5 h-3.5 fill-white text-white" />
                      </div>
                    </div>
                  </div>

                  <div className="p-4 flex flex-col gap-1 select-none">
                    <span className="text-[9px] text-violet-500 font-black uppercase tracking-widest">Tập {ep.episodeNumber}</span>
                    <h3 className="text-xs font-bold text-white group-hover:text-violet-400 transition-colors truncate mt-0.5">
                      {ep.title}
                    </h3>
                    <p className="text-[11px] text-zinc-500 truncate-2-lines leading-relaxed mt-0.5">
                      {ep.description}
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-2 text-center py-12 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-6 select-none">
                <Info className="w-6 h-6 text-zinc-650 mx-auto mb-2" />
                <p className="text-xs text-zinc-550 italic">Chưa có tập phim nào được phát hành.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REVIEWS FEEDBACK & BRAND TIERS (1/3 Grid) */}
        <div className="lg:col-span-1 flex flex-col gap-8">
          {/* Movie Leaderboard Tier Placement card */}
          {movie.leaderboard && (
            <div className="p-4 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex items-center gap-4 border-l-2 border-l-violet-500 shadow-md select-none">
              <Award className="w-8 h-8 text-violet-500 flex-shrink-0" />
              <div className="flex flex-col">
                <span className="text-[10px] text-zinc-550 font-bold uppercase tracking-wider">Xếp Hạng BXH</span>
                <span className="text-sm font-black text-white mt-0.5 uppercase tracking-wide">Xếp Hạng {movie.leaderboard.globalTier}-TIER</span>
                <span className="text-[11px] text-zinc-500">Thứ hạng {movie.leaderboard.rank || 'N/A'} toàn mạng</span>
              </div>
            </div>
          )}

          {/* List verified movie reviews */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-zinc-900/60 pb-4">
              <h2 className="text-sm font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3">
                Nhận Xét Người Xem
              </h2>
            </div>

            <div className="flex flex-col gap-4 max-h-[450px] overflow-y-auto pr-2 select-none">
              {reviews.length > 0 ? (
                reviews.map((rev) => (
                  <div key={rev.id} className="p-3.5 bg-zinc-950/40 border border-zinc-900 rounded-[4px] flex flex-col gap-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-[2px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                          {rev.user.email.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-zinc-300 font-semibold truncate max-w-[120px]">{rev.user.email.split('@')[0]}</span>
                      </div>
                      <span className="bg-amber-400/5 border border-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-[2px] text-[10px] font-extrabold flex items-center gap-0.5 shadow-sm">
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {rev.value}/10
                      </span>
                    </div>
                    {rev.review && <p className="text-xs text-zinc-400 leading-relaxed">{rev.review}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-6">
                  <Star className="w-6 h-6 text-zinc-650 mx-auto mb-2" />
                  <p className="text-xs text-zinc-550 italic">Chưa có nhận xét nào cho bộ phim này.</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
