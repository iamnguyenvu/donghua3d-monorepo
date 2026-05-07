'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Play, Calendar, Film, ArrowRight, Grid3X3, Sparkles } from 'lucide-react';
import Header from '../components/Header';
import { catalogApi, MoviePayload } from '../lib/api';

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
    createdAt: new Date().toISOString(),
    leaderboard: { globalTier: 'S' as any, tierScore: 94.5, rank: 1 }
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
    createdAt: new Date().toISOString(),
    leaderboard: { globalTier: 'A' as any, tierScore: 86.2, rank: 2 }
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
    createdAt: new Date().toISOString(),
    leaderboard: { globalTier: 'S' as any, tierScore: 91.0, rank: 3 }
  }
];

export default function Home() {
  const [movies, setMovies] = useState<MoviePayload[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<MoviePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  
  // Filtering & Sorting values
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating');

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
  }, []);

  // Filter and sort computations
  useEffect(() => {
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

    setFilteredMovies(result);
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
    <div className="min-h-screen bg-black text-white flex flex-col font-sans pb-16">
      <Header onSearchChange={setSearchQuery} />

      {/* ==============================================================================
         GIANT CINEMATIC HERO BANNER
         ============================================================================== */}
      <section className="relative w-full h-[85vh] flex items-center overflow-hidden">
        {/* Background Overlay Backdrop */}
        <div className="absolute inset-0 z-0">
          <Image
            src={heroMovie.bannerUrl || heroMovie.posterUrl || ''}
            alt={heroMovie.title}
            fill
            priority
            className="object-cover opacity-35 scale-105 transition-all duration-1000 ease-out"
          />
          {/* Edge vignettes & smooth gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0E] via-[#0A0A0E]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0E] via-[#0A0A0E]/30 to-transparent" />
        </div>

        {/* Hero Content text */}
        <div className="relative z-10 container mx-auto px-8 max-w-6xl flex flex-col items-start gap-6 mt-16 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="bg-violet-600/20 border border-violet-500/30 text-violet-300 font-bold px-3 py-1 rounded-full text-xs flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Nổi Bật Tuần Này
            </span>
            <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {heroMovie.releaseYear}
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            {heroMovie.title}
          </h1>
          
          <div className="flex items-center gap-3 text-sm text-zinc-300 font-semibold flex-wrap">
            <span className="text-violet-400 font-bold">{heroMovie.studio}</span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
              {heroMovie.rating.toFixed(1)}/10
            </span>
            <span>•</span>
            <span>Tên khác: {heroMovie.altTitles.join(', ')}</span>
          </div>

          <p className="max-w-2xl text-base text-zinc-400 leading-relaxed truncate-3-lines" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
            {heroMovie.description}
          </p>

          <div className="flex items-center gap-4 mt-2">
            <Link
              href={`/movies/${heroMovie.id}`}
              className="btn-cinema btn-cinema-primary rounded-full px-8 py-3 flex items-center gap-2 text-base"
            >
              <Play className="w-5 h-5 fill-white" />
              Xem Ngay
            </Link>
            <Link
              href={`/movies/${heroMovie.id}`}
              className="btn-cinema btn-cinema-secondary rounded-full px-6 py-3 text-base"
            >
              Chi tiết phim
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Carousel indicators */}
        <div className="absolute bottom-8 right-8 z-20 flex gap-2">
          {movies.slice(0, 3).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveHeroIdx(idx)}
              className={`h-2 rounded-full transition-all border-0 cursor-pointer ${
                activeHeroIdx === idx ? 'w-8 bg-violet-500' : 'w-2 bg-zinc-600'
              }`}
            />
          ))}
        </div>
      </section>

      {/* ==============================================================================
         GRID CATALOG & SEARCH FILTERS
         ============================================================================== */}
      <main className="container mx-auto px-8 max-w-6xl mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/10 pb-6 mb-8">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-5 h-5 text-violet-400" />
            <h2 className="text-2xl font-bold">Thư Viện Donghua 3D</h2>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">Năm:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm cursor-pointer outline-none focus:border-violet-500"
              >
                <option value="all">Tất cả năm</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2018">2018</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-zinc-900 border border-white/10 text-white rounded-lg px-3 py-1.5 text-sm cursor-pointer outline-none focus:border-violet-500"
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
              <div key={idx} className="flex flex-col gap-3">
                <div className="skeleton aspect-[2/3] rounded-xl" />
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filteredMovies.map((movie) => (
              <Link href={`/movies/${movie.id}`} key={movie.id} className="no-underline group">
                <div className="movie-card">
                  {/* Poster Image */}
                  <div className="relative w-full h-full">
                    <Image
                      src={movie.posterUrl || '/static/uploads/default_poster.jpg'}
                      alt={movie.title}
                      fill
                      className="movie-poster"
                    />
                  </div>

                  {/* Rating Badge */}
                  <div className="badge-rating">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {movie.rating.toFixed(1)}
                  </div>

                  {/* Global Tier Badge */}
                  {movie.leaderboard && (
                    <div className="absolute top-12 left-12 bg-black/80 backdrop-blur-md px-2.5 py-0.5 rounded border border-white/10 font-sans font-extrabold text-[11px]" style={{
                      color: movie.leaderboard.globalTier === 'S' ? '#ff7f7f' : movie.leaderboard.globalTier === 'A' ? '#ffbf7f' : '#bfff7f'
                    }}>
                      {movie.leaderboard.globalTier}-TIER
                    </div>
                  )}

                  {/* Movie Info Overlay */}
                  <div className="movie-overlay">
                    <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">{movie.studio}</span>
                    <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition-colors truncate mt-1">
                      {movie.title}
                    </h3>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                      {movie.altTitles[0]}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 glass-card p-12">
            <Film className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">Không tìm thấy bộ phim nào</h3>
            <p className="text-sm text-zinc-400 mt-1 max-w-sm mx-auto">
              Hãy thử gõ lại từ khóa khác hoặc điều chỉnh các bộ lọc phát hành phim của bạn.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
