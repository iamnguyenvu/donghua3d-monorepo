'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { Star, Play, Film, ArrowRight, Sparkles, Plus, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { MoviePayload, watchlistApi, Tier, analyticsApi, catalogApi } from '../lib/api';

// Helper to strip diacritics / accents for seamless Vietnamese unaccented search
function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Module-level day mapping for weekly schedule filter (stable reference, no useMemo deps issue)
const DAY_MAP: Record<string, number> = {
  'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3,
  'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6, 'CN': 7
};

// Pre-seeded high quality default fallback mock items to ensure immediate cinematic rendering
const fallbacks: MoviePayload[] = [
  {
    id: 'pw-1',
    title: 'Perfect World',
    altTitles: ['Thế Giới Hoàn Mỹ', '完美世界'],
    description: 'Trong thế giới hoang dã, một đứa trẻ mồ côi gánh trên vai vận mệnh của bộ tộc, kiên cường đứng dậy chinh phục bầu trời cao rộng lớn.',
    studio: 'Foch Film',
    releaseYear: 2021,
    posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
    bannerUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=1200&auto=format&fit=crop&q=60',
    rating: 9.2,
    expertRating: 9.4,
    audienceRating: 9.0,
    imdbRating: 8.2,
    createdAt: new Date().toISOString(),
    leaderboard: { globalTier: Tier.S, tierScore: 94.5, rank: 1 },
    episodeCount: 168,
    viewsCount: 45300,
    airingDay: 5
  },
  {
    id: 'sl-1',
    title: 'Soul Land',
    altTitles: ['Đấu La Đại Lục', '斗罗大陆'],
    description: 'Đường Tam sau khi từ bỏ giáo phái đã tái sinh tại Đấu La Đại Lục - nơi ngự trị của các linh hồn võ hồn song sinh thức tỉnh đầy uy lực.',
    studio: 'Sparkly Key Animation',
    releaseYear: 2018,
    posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=60',
    bannerUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=60',
    rating: 8.8,
    expertRating: 8.9,
    audienceRating: 8.7,
    imdbRating: 8.6,
    createdAt: new Date().toISOString(),
    leaderboard: { globalTier: Tier.A, tierScore: 86.2, rank: 2 },
    episodeCount: 263,
    viewsCount: 92400,
    airingDay: 6
  },
  {
    id: 'mj-1',
    title: 'A Record of Mortals Journey to Immortality',
    altTitles: ['Phàm Nhân Tu Tiên', '凡人修仙传'],
    description: 'Hành trình của một người phàm bình thường xuất thân từ ngôi làng nhỏ, từng bước tu chân tu tiên bằng trí tuệ cẩn trọng và kiên định.',
    studio: 'Original Force',
    releaseYear: 2020,
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=60',
    bannerUrl: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1200&auto=format&fit=crop&q=60',
    rating: 9.0,
    expertRating: 9.2,
    audienceRating: 8.8,
    imdbRating: 9.0,
    createdAt: new Date().toISOString(),
    leaderboard: { globalTier: Tier.S, tierScore: 91.0, rank: 3 },
    episodeCount: 110,
    viewsCount: 52100,
    airingDay: 7
  }
];

export default function HomeClient({ initialMovies = [] }: { initialMovies: MoviePayload[] }) {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('search') || searchParams.get('q') || '';

  const [movies, setMovies] = useState<MoviePayload[]>(initialMovies.length > 0 ? initialMovies : fallbacks);
  const loading = false;
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);

  useEffect(() => {
    async function syncLatestMovies() {
      try {
        const res = await catalogApi.getMovies();
        if (res.success && res.data) {
          setMovies(res.data);
        }
      } catch (err) {
        console.error('Failed to sync movies on homepage:', err);
      }
    }
    syncLatestMovies();
  }, []);
  
  // Filtering & Sorting values
  const [searchQuery, setSearchQuery] = useState(queryParam);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(queryParam);
  }, [queryParam]);

  // Watchlist states
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [watchlistActionLoading, setWatchlistActionLoading] = useState(false);

  // Weekly schedule filter
  const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'] as const;
  type DayKey = typeof DAYS[number];
  const [selectedDay, setSelectedDay] = useState<DayKey | 'all'>('all');

  useEffect(() => {
    // Default to the current day of the week on client mount to avoid empty section display
    const day = new Date().getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const mapDay: Record<number, DayKey> = {
      1: 'Thứ 2',
      2: 'Thứ 3',
      3: 'Thứ 4',
      4: 'Thứ 5',
      5: 'Thứ 6',
      6: 'Thứ 7',
      0: 'CN'
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedDay(mapDay[day] || 'Thứ 2');
  }, []);

  useEffect(() => {
    analyticsApi.trackBehavior('PAGE_VIEW', { path: '/' });
    
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

  // Filter and sort computations
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    if (searchQuery) {
      const q = removeAccents(searchQuery.toLowerCase().trim());
      result = result.filter(
        (m) =>
          removeAccents(m.title.toLowerCase()).includes(q) ||
          m.altTitles.some((alt) => removeAccents(alt.toLowerCase()).includes(q)) ||
          (m.studio && removeAccents(m.studio.toLowerCase()).includes(q))
      );
    }

    if (selectedYear !== 'all') {
      result = result.filter((m) => m.releaseYear === parseInt(selectedYear, 10));
    }

    if (sortBy === 'updated') {
      result.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'year') {
      result.sort((a, b) => b.releaseYear - a.releaseYear);
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [movies, searchQuery, selectedYear, sortBy]);

  // Independent list for Weekly Schedule
  const weeklyScheduleMovies = useMemo(() => {
    if (selectedDay === 'all') {
      return movies.filter(m => m.airingDay !== null && m.airingDay !== undefined)
                   .sort((a, b) => Number(a.airingDay || 0) - Number(b.airingDay || 0));
    }
    return movies.filter(m => m.airingDay === DAY_MAP[selectedDay as DayKey]);
  }, [movies, selectedDay]);

  // Independent list for Recently Updated Movies
  const recentlyUpdatedMovies = useMemo(() => {
    return [...movies].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    }).slice(0, 12);
  }, [movies]);

  // Rotate Hero Carousel slide
  useEffect(() => {
    if (movies.length === 0) return;
    const interval = setInterval(() => {
      setActiveHeroIdx((prev) => (prev + 1) % Math.min(movies.length, 3));
    }, 8000);
    return () => clearInterval(interval);
  }, [movies]);

  const heroMovie = movies[activeHeroIdx] || fallbacks[0];

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans">
      <Header onSearchChange={setSearchQuery} />

      {/* ==============================================================================
         GIANT CINEMATIC HERO BANNER (Layout 02 Netflix Style - Custom Purple Accent)
         ============================================================================== */}
      <section className="relative w-full h-[80vh] flex items-center overflow-hidden border-b border-zinc-900/40 group/hero">
        {/* Background Overlay Backdrop */}
        <div className="absolute inset-0 z-0">
          <Image
            src={heroMovie.posterUrl || heroMovie.bannerUrl || ''}
            alt={heroMovie.title}
            fill
            priority
            className="object-cover opacity-45 scale-100 transition-all duration-1000 ease-out"
          />
          {/* Edge vignettes & smooth gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050508] via-[#050508]/40 to-transparent" />
        </div>

        {/* Hero Content text */}
        <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 flex flex-col items-start gap-5 mt-20 animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <span className="bg-violet-600/25 border border-violet-500/35 text-violet-300 font-extrabold px-2.5 py-1 rounded-[4px] text-[10px] uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-violet-400" />
              Phim Đang Hot
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white leading-none uppercase" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)', fontFamily: 'var(--font-space-grotesk)' }}>
            {heroMovie.title}
          </h1>
          
          {/* Premium Pill Metadata Grid */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="border border-zinc-800 bg-zinc-950/60 text-violet-400 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
              {heroMovie.studio}
            </span>
            <span className="border border-zinc-800 bg-zinc-950/60 text-amber-400 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1">
              ⭐ {heroMovie.rating > 0 ? heroMovie.rating.toFixed(1) : '9.0'} / 10
            </span>
            {heroMovie.imdbRating && (
              <span className="border border-zinc-800 bg-zinc-950/60 text-[#F5C518] px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5">
                <span className="bg-[#F5C518] text-black px-1 rounded-[2px] font-black">IMDb</span> {heroMovie.imdbRating.toFixed(1)} / 10
              </span>
            )}
            <span className="border border-zinc-800 bg-zinc-950/60 text-zinc-300 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
              {heroMovie.releaseYear}
            </span>
            <span className="border border-zinc-800 bg-zinc-950/60 text-zinc-300 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
              FULL HD 1080P
            </span>
            <span className="border border-zinc-800 bg-zinc-950/60 text-zinc-300 px-2.5 py-1.5 rounded-[4px] text-[10px] font-extrabold tracking-wider uppercase">
              AAC 5.1 CH
            </span>
            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider ml-2 hidden sm:inline">
              Tên khác: <span className="text-zinc-300">{heroMovie.altTitles[0] || 'N/A'}</span>
            </span>
          </div>

          <p className="max-w-xl text-xs md:text-sm text-zinc-400 leading-relaxed line-clamp-3" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {heroMovie.description}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mt-2.5 w-full sm:w-auto">
            <Link
              href={`/movies/${heroMovie.slug || heroMovie.id}`}
              className="px-6 py-3.5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-extrabold flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_25px_rgba(124,58,237,0.5)] cursor-pointer border-0 outline-none no-underline w-full sm:w-auto"
            >
              <Play className="w-4 h-4 fill-white text-white" />
              Xem Ngay
            </Link>

            <button
              onClick={() => toggleWatchlist(heroMovie.id)}
              disabled={watchlistActionLoading}
              className="px-6 py-3.5 rounded-[4px] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-white font-extrabold flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider transition-all duration-300 active:scale-95 cursor-pointer outline-none w-full sm:w-auto"
            >
              {watchlistActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : watchlistIds.has(heroMovie.id) ? (
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

            <Link
              href={`/movies/${heroMovie.slug || heroMovie.id}`}
              className="px-6 py-3.5 rounded-[4px] bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 text-zinc-300 font-extrabold flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider transition-all duration-300 active:scale-95 text-xs no-underline w-full sm:w-auto"
            >
              Chi tiết phim
              <ArrowRight className="w-4 h-4 text-zinc-500" />
            </Link>
          </div>
        </div>

        {/* Side Manual Arrows */}
        <button
          onClick={() => setActiveHeroIdx((prev) => (prev - 1 + Math.min(movies.length, 3)) % Math.min(movies.length, 3))}
          className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 border border-zinc-800/40 hover:bg-black/60 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all duration-300 cursor-pointer outline-none opacity-0 group-hover/hero:opacity-100 hidden md:flex items-center justify-center shadow-md"
          title="Slide trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={() => setActiveHeroIdx((prev) => (prev + 1) % Math.min(movies.length, 3))}
          className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/40 border border-zinc-800/40 hover:bg-black/60 hover:border-zinc-700 text-zinc-400 hover:text-white transition-all duration-300 cursor-pointer outline-none opacity-0 group-hover/hero:opacity-100 hidden md:flex items-center justify-center shadow-md"
          title="Slide sau"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Carousel indicators centered horizontally at the bottom */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2.5">
          {movies.slice(0, 3).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveHeroIdx(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-500 border-0 cursor-pointer ${
                activeHeroIdx === idx ? 'bg-violet-500 scale-125' : 'bg-zinc-700 hover:bg-zinc-550'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ==============================================================================
         S-TIER TRENDING ROW (Layout 02 Netflix Style - Aspect 3/4)
         ============================================================================== */}
      {movies.some(m => m.leaderboard?.globalTier === 'S') && (
        <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 mt-14 select-none animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-900/60 pb-4">
            <h2 className="text-lg font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Phim Thịnh Hành (S-Tier)
            </h2>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3">
            {movies
              .filter(m => m.leaderboard?.globalTier === 'S')
              .slice(0, 10)
              .map(movie => (
                <Link href={`/movies/${movie.slug || movie.id}`} key={movie.id} className="no-underline group flex flex-col gap-2">
                  {/* Poster Container with premium cinematic hover and shadow */}
                  <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] bg-zinc-950 shadow-lg">
                    {/* Poster Image using horizontal bannerUrl inside vertical card */}
                    <div className="relative w-full h-full">
                      <Image
                        src={movie.bannerUrl || movie.posterUrl || '/static/uploads/default_poster.jpg'}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                        className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                      {/* Gradient overlay for cinematic shadow depth */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/15 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
                    </div>

                    {/* Quick premium micro-info displaying on hover */}
                    <div className="absolute inset-0 flex flex-col justify-end p-3 bg-[#050508]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-350 ease-out z-20">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white mx-auto mb-2.5 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-350 delay-75">
                        <Play className="w-4 h-4 fill-white ml-0.5" />
                      </div>
                      <span className="text-[9px] font-black tracking-widest text-violet-400 uppercase text-center block">{movie.studio}</span>
                      <span className="text-[10px] font-extrabold text-zinc-300 text-center block mt-0.5">{movie.releaseYear}</span>
                    </div>

                    {/* Rating star badge in bottom-right with amber star */}
                    <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md border border-amber-400/25 text-amber-400 px-1.5 py-1 rounded-[4px] text-[9px] font-extrabold flex items-center gap-0.5 z-10 shadow-md">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      {movie.rating > 0 ? movie.rating.toFixed(1) : '9.0'}
                    </div>

                    {/* Episode Badge on top-right (High CTR Bright Red/Orange like competitors) */}
                    {movie.episodeCount !== undefined && movie.episodeCount > 0 && (
                      <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-orange-500 to-red-600 border border-red-400/50 text-white font-black px-2 py-0.5 rounded-[3px] text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 select-none">
                        Tập {movie.episodeCount}
                      </div>
                    )}

                    {/* Trending label in top-left */}
                    <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-violet-600 to-indigo-650 text-white text-[8px] font-extrabold tracking-widest px-2 py-1.5 rounded-[4px] z-10 shadow-md">
                      HOT S-TIER
                    </div>
                  </div>

                  <div className="flex flex-col gap-0.5 mt-1">
                    <h3 className="text-[12px] font-bold text-white group-hover:text-violet-400 transition-colors truncate leading-tight">
                      {movie.title}
                    </h3>
                    <div className="flex items-center justify-between text-[10px] text-zinc-550">
                      <span>{movie.releaseYear}</span>
                      <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded-[2px] uppercase">{movie.studio}</span>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      )}

      {/* ==============================================================================
         WEEKLY SCHEDULE TABS BAR
         ============================================================================== */}
      <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 mt-12 select-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3">
              📅 Lịch Phim Tuần Này
            </h2>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedDay('all')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                selectedDay === 'all'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-900'
              }`}
            >
              Tất Cả
            </button>
            {DAYS.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border-0 ${
                  selectedDay === day
                    ? 'bg-violet-600 text-white shadow-md'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-900'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {/* Show empty state if no movies airing today */}
        {weeklyScheduleMovies.length === 0 && (
          <div className="text-center py-8 text-[11px] text-zinc-600 italic border border-zinc-900/50 rounded-[4px] bg-zinc-950/30">
            {selectedDay === 'all' ? 'Chưa có phim nào có lịch chiếu được thiết lập.' : `Chưa có phim nào lên sóng vào ${selectedDay} tuần này.`}
          </div>
        )}

        {/* Horizontal scroll list for weekly movies */}
        {weeklyScheduleMovies.length > 0 && (
          <div className="mt-6 overflow-x-auto hide-scrollbar pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-12 md:px-12 lg:-mx-16 lg:px-16 flex items-start gap-4">
            {weeklyScheduleMovies.map(movie => (
              <Link href={`/movies/${movie.slug || movie.id}`} key={`weekly-${movie.id}`} className="no-underline group flex-shrink-0 w-32 md:w-36 flex flex-col gap-2">
                <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] cursor-pointer transition-all duration-300 group-hover:border-violet-500/50 bg-zinc-950">
                  <Image
                    src={movie.bannerUrl || movie.posterUrl || '/static/uploads/default_poster.jpg'}
                    alt={movie.title}
                    fill
                    sizes="(max-width: 768px) 150px, 200px"
                    className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Episode Badge on top-right */}
                  {movie.episodeCount !== undefined && movie.episodeCount > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-rose-600 border border-rose-400 text-white font-black px-1.5 py-0.5 rounded-[2px] text-[8px] uppercase tracking-wider z-10">
                      Tập {movie.episodeCount}
                    </div>
                  )}
                  {/* Day Badge on top-left (shown only when selectedDay is 'all' to help user identify which day it airs on) */}
                  {selectedDay === 'all' && movie.airingDay && (
                    <div className="absolute top-1.5 left-1.5 bg-violet-650/90 border border-violet-500 text-white font-black px-1.5 py-0.5 rounded-[2px] text-[8px] uppercase tracking-wider z-10 shadow-sm">
                      {Object.keys(DAY_MAP).find(k => DAY_MAP[k] === movie.airingDay) || ''}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
                <h3 className="text-[11px] font-bold text-white group-hover:text-violet-400 transition-colors truncate">{movie.title}</h3>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ==============================================================================
         RECENTLY UPDATED ROW
         ============================================================================== */}
      {recentlyUpdatedMovies.length > 0 && (
        <section className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 mt-14 select-none animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-900/60 pb-4">
            <h2 className="text-lg font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3 flex items-center gap-1.5">
              🚀 Phim Mới Cập Nhật
            </h2>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6">
            {recentlyUpdatedMovies.map(movie => (
              <Link href={`/movies/${movie.slug || movie.id}`} key={`recent-${movie.id}`} className="no-underline group flex flex-col gap-2">
                {/* Poster Frame */}
                <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] bg-zinc-950 shadow-lg">
                  {/* Poster Image */}
                  <div className="relative w-full h-full">
                    <Image
                      src={movie.bannerUrl || movie.posterUrl || '/static/uploads/default_poster.jpg'}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    {/* Gradient overlay for cinematic shadow depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/15 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
                  </div>

                  {/* Quick premium micro-info displaying on hover */}
                  <div className="absolute inset-0 flex flex-col justify-end p-3 bg-[#050508]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-350 ease-out z-20">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white mx-auto mb-2.5 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-350 delay-75">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                    <span className="text-[9px] font-black tracking-widest text-violet-400 uppercase text-center block">{movie.studio || 'Donghua'}</span>
                    <span className="text-[10px] font-extrabold text-zinc-300 text-center block mt-0.5">{movie.releaseYear}</span>
                  </div>

                  {/* Rating Badge in bottom-right */}
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md border border-amber-400/25 text-amber-400 px-1.5 py-1 rounded-[4px] text-[9px] font-extrabold flex items-center gap-0.5 z-10 shadow-md select-none">
                    {movie.rating > 0 ? (
                      <>
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {movie.rating.toFixed(1)}
                      </>
                    ) : (
                      <span className="text-[8px] tracking-wider font-extrabold text-amber-400 uppercase">1080P</span>
                    )}
                  </div>

                  {/* Global Tier Badge */}
                  {movie.leaderboard?.globalTier && (
                    (movie.leaderboard.s_tier_count || 0) +
                    (movie.leaderboard.a_tier_count || 0) +
                    (movie.leaderboard.b_tier_count || 0) +
                    (movie.leaderboard.c_tier_count || 0) +
                    (movie.leaderboard.d_tier_count || 0) +
                    (movie.leaderboard.f_tier_count || 0) > 0
                  ) && (
                    <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-[4px] border border-zinc-800 text-[8px] font-extrabold tracking-wider z-10 shadow-md" style={{
                      color: movie.leaderboard.globalTier === 'S' ? '#ff7f7f' : movie.leaderboard.globalTier === 'A' ? '#ffbf7f' : '#bfff7f'
                    }}>
                      {movie.leaderboard.globalTier}-TIER
                    </div>
                  )}

                  {/* Episode Badge on Poster (High CTR Bright Red/Orange like competitors) */}
                  {movie.episodeCount !== undefined && movie.episodeCount > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-orange-500 to-red-600 border border-red-400/50 text-white font-black px-2 py-0.5 rounded-[3px] text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 select-none">
                      Tập {movie.episodeCount}
                    </div>
                  )}

                  {/* Updated Time Overlay */}
                  <div className="absolute bottom-1.5 left-1.5 bg-violet-950/90 backdrop-blur-md border border-violet-500/30 text-violet-350 px-1.5 py-0.5 rounded-[3px] text-[8px] font-extrabold tracking-wider z-10 select-none">
                    {movie.updatedAt ? new Date(movie.updatedAt).toLocaleDateString('vi-VN') : 'MỚI'}
                  </div>
                </div>

                {/* Movie Info — title + update status + studio */}
                <div className="flex flex-col gap-0.5 mt-1 select-none">
                  <h3 className="text-[12px] font-bold text-white group-hover:text-violet-400 transition-colors truncate leading-tight">
                    {movie.title}
                  </h3>
                  {movie.altTitles?.[0] && (
                    <p className="text-[10px] text-zinc-550 truncate leading-tight">
                      {movie.altTitles[0]}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-zinc-550 mt-0.5 gap-1 flex-wrap">
                    <span className="text-[9px] font-extrabold text-violet-400 tracking-wider">
                      CẬP NHẬT
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1 rounded-[2px] uppercase truncate max-w-[70px]">{movie.studio || 'Donghua'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ==============================================================================
         GRID CATALOG & SEARCH FILTERS
         ============================================================================== */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 mt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900/60 pb-5 mb-8">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3">
              Thư Viện Donghua 3D
            </h2>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-[#0c0c0f] border border-zinc-800/80 text-zinc-300 rounded-[4px] px-3 py-1.5 text-xs cursor-pointer outline-none focus:border-zinc-700 transition-all duration-300"
              >
                <option value="all">Tất cả năm</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2018">2018</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-[#0c0c0f] border border-zinc-800/80 text-zinc-300 rounded-[4px] px-3 py-1.5 text-xs cursor-pointer outline-none focus:border-zinc-700 transition-all duration-300"
              >
                <option value="rating">Điểm Đánh Giá</option>
                <option value="year">Năm Phát Hành</option>
                <option value="title">Tựa Đề A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-[2/3] rounded-[4px] bg-zinc-900 border border-zinc-800" />
                <div className="h-3 bg-zinc-900 rounded-[2px] w-3/4" />
                <div className="h-2.5 bg-zinc-900 rounded-[2px] w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredMovies.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-x-3 gap-y-6">
            {filteredMovies.map((movie) => (
              <Link href={`/movies/${movie.slug || movie.id}`} key={movie.id} className="no-underline group flex flex-col gap-2">
                {/* Poster Frame */}
                <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] bg-zinc-950 shadow-lg">
                  {/* Poster Image */}
                  <div className="relative w-full h-full">
                    <Image
                      src={movie.bannerUrl || movie.posterUrl || '/static/uploads/default_poster.jpg'}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    {/* Gradient overlay for cinematic shadow depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/15 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
                  </div>

                  {/* Quick premium micro-info displaying on hover */}
                  <div className="absolute inset-0 flex flex-col justify-end p-3 bg-[#050508]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-350 ease-out z-20">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white mx-auto mb-2.5 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-350 delay-75">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                    <span className="text-[9px] font-black tracking-widest text-violet-400 uppercase text-center block">{movie.studio || 'Donghua'}</span>
                    <span className="text-[10px] font-extrabold text-zinc-300 text-center block mt-0.5">{movie.releaseYear}</span>
                  </div>

                  {/* Rating Badge in bottom-right */}
                  <div className="absolute bottom-1.5 right-1.5 bg-black/80 backdrop-blur-md border border-amber-400/25 text-amber-400 px-1.5 py-1 rounded-[4px] text-[9px] font-extrabold flex items-center gap-0.5 z-10 shadow-md select-none">
                    {movie.rating > 0 ? (
                      <>
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {movie.rating.toFixed(1)}
                      </>
                    ) : (
                      <span className="text-[8px] tracking-wider font-extrabold text-amber-400 uppercase">1080P</span>
                    )}
                  </div>

                  {/* Global Tier Badge */}
                  {movie.leaderboard && (
                    movie.leaderboard.globalTier === 'S' ||
                    (movie.leaderboard.s_tier_count || 0) +
                    (movie.leaderboard.a_tier_count || 0) +
                    (movie.leaderboard.b_tier_count || 0) +
                    (movie.leaderboard.c_tier_count || 0) +
                    (movie.leaderboard.d_tier_count || 0) +
                    (movie.leaderboard.f_tier_count || 0) > 0
                  ) && (
                    <div className="absolute top-1.5 left-1.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-[4px] border border-zinc-800 text-[8px] font-extrabold tracking-wider z-10 shadow-md" style={{
                      color: movie.leaderboard.globalTier === 'S' ? '#ff7f7f' : movie.leaderboard.globalTier === 'A' ? '#ffbf7f' : '#bfff7f'
                    }}>
                      {movie.leaderboard.globalTier}-TIER
                    </div>
                  )}

                  {/* Episode Badge on Poster (High CTR Bright Red/Orange like competitors) */}
                  {movie.episodeCount !== undefined && movie.episodeCount > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-orange-500 to-red-600 border border-red-400/50 text-white font-black px-2 py-0.5 rounded-[3px] text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 select-none">
                      Tập {movie.episodeCount}
                    </div>
                  )}
                </div>

                {/* Movie Info — dual-title + views + studio */}
                <div className="flex flex-col gap-0.5 mt-1 select-none">
                  <h3 className="text-[12px] font-bold text-white group-hover:text-violet-400 transition-colors truncate leading-tight">
                    {movie.title}
                  </h3>
                  {movie.altTitles?.[0] && (
                    <p className="text-[10px] text-zinc-500 truncate leading-tight">
                      {movie.altTitles[0]}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-[10px] text-zinc-550 mt-0.5 gap-1 flex-wrap">
                    <span className="text-[10px] text-zinc-400 font-semibold whitespace-nowrap">
                      {movie.releaseYear}
                      {movie.viewsCount !== undefined && movie.viewsCount > 0 && (
                        <>
                          <span className="text-zinc-600 mx-1">•</span>
                          <span>👁 {movie.viewsCount >= 1000 ? `${(movie.viewsCount / 1000).toFixed(1)}K` : movie.viewsCount}</span>
                        </>
                      )}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1 rounded-[2px] uppercase truncate max-w-[70px]">{movie.studio || 'Donghua'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-12 max-w-xl mx-auto">
            <Film className="w-10 h-10 text-zinc-650 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Không tìm thấy bộ phim nào</h3>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Hãy thử gõ lại từ khóa khác hoặc điều chỉnh các bộ lọc phát hành phim của bạn.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
