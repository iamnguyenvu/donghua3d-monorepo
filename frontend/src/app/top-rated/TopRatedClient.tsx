'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Play } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { MoviePayload, catalogApi } from '@/lib/api';

function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export default function TopRatedClient() {
  const [movies, setMovies] = useState<MoviePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadTopRatedMovies() {
      try {
        setLoading(true);
        // Query movies with minimum rating 8, sorted by rating desc
        const res = await catalogApi.getMovies({ minRating: 8, sort: 'rating' });
        if (res.success && res.data) {
          setMovies(res.data);
        }
      } catch (err) {
        console.error('Failed to load top rated movies:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTopRatedMovies();
  }, []);

  const filteredMovies = useMemo(() => {
    if (!searchQuery) return movies;
    const q = removeAccents(searchQuery.toLowerCase().trim());
    return movies.filter(
      (m) =>
        removeAccents(m.title.toLowerCase()).includes(q) ||
        m.altTitles.some((alt) => removeAccents(alt.toLowerCase()).includes(q)) ||
        (m.studio && removeAccents(m.studio.toLowerCase()).includes(q))
    );
  }, [movies, searchQuery]);

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans">
      <Header onSearchChange={setSearchQuery} />

      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 lg:px-16 mt-28 flex-grow">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900/60 pb-5 mb-8">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-wider uppercase border-l-2 border-amber-500 pl-3 flex items-center gap-2">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              Siêu Phẩm Đánh Giá Cao (Top Rated)
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Tổng hợp các phim có điểm đánh giá từ 8.0 trở lên của cộng đồng tu tiên
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-[2/3] rounded-[4px] bg-zinc-900 border border-zinc-800" />
                <div className="h-3 bg-zinc-900 rounded-[2px] w-3/4" />
                <div className="h-2.5 bg-zinc-900 rounded-[2px] w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredMovies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-8 mb-16">
            {filteredMovies.map((movie, index) => (
              <Link href={`/movies/${movie.slug || movie.id}`} key={movie.id} className="no-underline group flex flex-col gap-2 relative">
                {/* Visual Rank Badge */}
                <div className="absolute -top-2.5 -left-2.5 w-7 h-7 rounded-full bg-amber-500/20 backdrop-blur-md border border-amber-450/40 text-amber-300 flex items-center justify-center text-[10px] font-black z-30 shadow-md">
                  #{index + 1}
                </div>

                <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] cursor-pointer transition-all duration-500 hover:scale-[1.04] hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] bg-zinc-950 shadow-lg">
                  <div className="relative w-full h-full">
                    <Image
                      src={movie.bannerUrl || movie.posterUrl || '/static/uploads/default_poster.jpg'}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/15 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />
                  </div>

                  <div className="absolute inset-0 flex flex-col justify-end p-3 bg-[#050508]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-350 ease-out z-20">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-600 text-white mx-auto mb-2.5 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-350 delay-75">
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </div>
                    <span className="text-[9px] font-black tracking-widest text-violet-400 uppercase text-center block">{movie.studio || 'Donghua'}</span>
                    <span className="text-[10px] font-extrabold text-zinc-300 text-center block mt-0.5">{movie.releaseYear}</span>
                  </div>

                  {/* Highlighted rating score */}
                  <div className="absolute bottom-1.5 right-1.5 bg-gradient-to-r from-amber-500/90 to-orange-600/90 backdrop-blur-md border border-amber-400/50 text-white px-2 py-1 rounded-[4px] text-[10px] font-black flex items-center gap-1 z-10 shadow-md">
                    <Star className="w-3 h-3 fill-white text-white" />
                    {movie.rating > 0 ? movie.rating.toFixed(1) : '9.0'}
                  </div>

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

                  {movie.episodeCount !== undefined && movie.episodeCount > 0 && (
                    <div className="absolute top-1.5 right-1.5 bg-gradient-to-r from-orange-500 to-red-600 border border-red-400/50 text-white font-black px-2 py-0.5 rounded-[3px] text-[10px] uppercase tracking-wider shadow-[0_0_10px_rgba(239,68,68,0.5)] z-10 select-none">
                      Tập {movie.episodeCount}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 mt-1">
                  <h3 className="text-[12px] font-bold text-white group-hover:text-violet-400 transition-colors truncate leading-tight">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-zinc-550">
                    <span>{movie.releaseYear}</span>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1.5 py-0.2 rounded-[2px] uppercase truncate max-w-[80px]">{movie.studio}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-500 bg-zinc-950/20 border border-zinc-900/50 rounded-[4px] my-12">
            Không tìm thấy phim được đánh giá cao nào.
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
