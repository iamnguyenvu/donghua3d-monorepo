'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Play, Film, ArrowRight, Sparkles, Plus, Check, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '../components/Header';
import { catalogApi, MoviePayload, watchlistApi, Tier, getPosterPosition } from '../lib/api';

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
    leaderboard: { globalTier: Tier.S, tierScore: 94.5, rank: 1 }
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
    leaderboard: { globalTier: Tier.A, tierScore: 86.2, rank: 2 }
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
    leaderboard: { globalTier: Tier.S, tierScore: 91.0, rank: 3 }
  }
];

export default function Home() {
  const [movies, setMovies] = useState<MoviePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  
  // Filtering & Sorting values
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');

  // Watchlist states
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [watchlistActionLoading, setWatchlistActionLoading] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      const res = await catalogApi.getMovies();
      if (res.success && res.data && res.data.length > 0) {
        setMovies(res.data);
      } else {
        // Fallback to gorgeous client mock assets
        setMovies(fallbacks);
      }
      setLoading(false);
    }
    loadCatalog();

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
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.altTitles.some((alt) => alt.toLowerCase().includes(q)) ||
          (m.studio && m.studio.toLowerCase().includes(q))
      );
    }

    if (selectedYear !== 'all') {
      result = result.filter((m) => m.releaseYear === parseInt(selectedYear, 10));
    }

    if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'year') {
      result.sort((a, b) => b.releaseYear - a.releaseYear);
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [movies, searchQuery, selectedYear, sortBy]);

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
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header onSearchChange={setSearchQuery} />

      {/* ==============================================================================
         GIANT CINEMATIC HERO BANNER (Layout 02 Netflix Style - Custom Purple Accent)
         ============================================================================== */}
      <section className="relative w-full h-[80vh] flex items-center overflow-hidden border-b border-zinc-900/40 group/hero">
        {/* Background Overlay Backdrop */}
        <div className="absolute inset-0 z-0">
          <Image
            src={heroMovie.bannerUrl || heroMovie.posterUrl || ''}
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
        <div className="relative z-10 w-full px-6 md:px-12 lg:px-16 flex flex-col items-start gap-5 mt-20 animate-fade-in-up">
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

          <p className="max-w-xl text-xs md:text-sm text-zinc-400 leading-relaxed truncate-3-lines" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {heroMovie.description}
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5 mt-2.5 w-full sm:w-auto">
            <Link
              href={`/movies/${heroMovie.id}`}
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
              href={`/movies/${heroMovie.id}`}
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
        <section className="w-full px-6 md:px-12 lg:px-16 mt-14 select-none animate-fade-in-up">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-900/60 pb-4">
            <h2 className="text-sm font-black text-white tracking-widest uppercase border-l-2 border-violet-500 pl-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Phim Thịnh Hành (S-Tier)
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
            {movies
              .filter(m => m.leaderboard?.globalTier === 'S')
              .slice(0, 8)
              .map(movie => (
                <Link href={`/movies/${movie.id}`} key={movie.id} className="no-underline group flex flex-col gap-2">
                  {/* Poster Container with premium cinematic hover and shadow */}
                  <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] bg-zinc-950 shadow-lg">
                    {/* Poster Image using dynamic alignment to avoid cropping heads */}
                    <div className="relative w-full h-full">
                      <Image
                        src={movie.posterUrl || '/static/uploads/default_poster.jpg'}
                        alt={movie.title}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                        className={`object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${getPosterPosition(movie.title)}`}
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

                    {/* Rating star badge in top-right with amber star */}
                    <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md border border-amber-400/25 text-amber-400 px-2 py-1 rounded-[4px] text-[10px] font-extrabold flex items-center gap-1 z-10 shadow-md">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {movie.rating > 0 ? movie.rating.toFixed(1) : '9.0'}
                    </div>

                    {/* Trending label in top-left */}
                    <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[8px] font-extrabold tracking-widest px-2 py-1.5 rounded-[4px] z-10 shadow-md">
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
         GRID CATALOG & SEARCH FILTERS
         ============================================================================== */}
      <main className="w-full px-6 md:px-12 lg:px-16 mt-14">
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-6 gap-y-8">
            {filteredMovies.map((movie) => (
              <Link href={`/movies/${movie.id}`} key={movie.id} className="no-underline group flex flex-col gap-2">
                {/* Poster Frame */}
                <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] bg-zinc-950 shadow-lg">
                  {/* Poster Image */}
                  <div className="relative w-full h-full">
                    <Image
                      src={movie.posterUrl || '/static/uploads/default_poster.jpg'}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className={`object-cover transition-transform duration-700 ease-out group-hover:scale-110 ${getPosterPosition(movie.title)}`}
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

                  {/* Rating Badge */}
                  <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md border border-amber-400/25 text-amber-400 px-1.5 py-1 rounded-[4px] text-[9px] font-extrabold flex items-center gap-0.5 z-10 shadow-md select-none">
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
                    <div className="absolute top-2.5 left-2.5 bg-black/80 backdrop-blur-md px-2 py-1 rounded-[4px] border border-zinc-800 text-[8px] font-extrabold tracking-wider z-10 shadow-md" style={{
                      color: movie.leaderboard.globalTier === 'S' ? '#ff7f7f' : movie.leaderboard.globalTier === 'A' ? '#ffbf7f' : '#bfff7f'
                    }}>
                      {movie.leaderboard.globalTier}-TIER
                    </div>
                  )}
                </div>

                {/* Movie Info (Placed below the poster card for an extremely premium list look) */}
                <div className="flex flex-col gap-0.5 mt-1 select-none">
                  <h3 className="text-[12px] font-bold text-white group-hover:text-violet-400 transition-colors truncate leading-tight">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-zinc-550">
                    <span>{movie.releaseYear}</span>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded-[2px] uppercase">{movie.studio}</span>
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
    </div>
  );
}
