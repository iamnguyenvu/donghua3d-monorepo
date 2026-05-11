'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Star, Film, Loader2, ArrowLeft, Trash2, LayoutGrid, Play } from 'lucide-react';
import Header from '../../components/Header';
import { watchlistApi, authApi, MoviePayload, UserPayload } from '../../lib/api';

export default function WatchlistPage() {
  const [user, setUser] = useState<UserPayload | null>(null);
  const [watchlist, setWatchlist] = useState<MoviePayload[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Load profile state and watchlist on mount
  useEffect(() => {
    async function init() {
      const token = localStorage.getItem('donghua3d_token');
      if (token) {
        const profileRes = await authApi.getMe();
        if (profileRes.success && profileRes.data) {
          setUser(profileRes.data);
          // Load watchlist
          setLoadingList(true);
          const listRes = await watchlistApi.getWatchlist();
          if (listRes.success && listRes.data) {
            setWatchlist(listRes.data);
          }
          setLoadingList(false);
        }
      }
      setLoadingUser(false);
    }
    init();
  }, []);

  const handleRemove = async (movieId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setRemovingId(movieId);
    try {
      const res = await watchlistApi.removeFromWatchlist(movieId);
      if (res.success) {
        // Optimistic update
        setWatchlist((prev) => prev.filter((m) => m.id !== movieId));
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="w-full px-6 md:px-12 lg:px-16 mt-28 flex-grow flex flex-col">
        {/* Page title header */}
        <div className="flex items-center gap-4 border-b border-zinc-900/60 pb-5 mb-8">
          <Link 
            href="/"
            className="px-3 py-1.5 rounded-[4px] bg-zinc-950 border border-zinc-850 hover:bg-zinc-900 hover:border-zinc-800 text-zinc-400 hover:text-white transition-all text-xs flex items-center gap-1.5 no-underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Quay lại
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-white tracking-wider uppercase border-l-2 border-violet-500 pl-3">
              Danh Sách Của Tôi
            </h1>
          </div>
        </div>

        {/* Dynamic content area */}
        {loadingUser ? (
          <div className="flex-grow flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : !user ? (
          /* Guest Screen state */
          <div className="flex-grow flex flex-col items-center justify-center text-center py-16 max-w-sm mx-auto select-none">
            <div className="p-4 rounded-[4px] bg-violet-650/10 border border-violet-600/20 mb-5 animate-pulse">
              <Film className="w-8 h-8 text-violet-500" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-wider">Yêu Cầu Đăng Nhập</h2>
            <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
              Tính năng &quot;Danh sách của tôi&quot; giúp bạn đồng bộ danh sách phim yêu thích trên mọi thiết bị. Hãy đăng nhập để tiếp tục trải nghiệm.
            </p>
            <Link 
              href="/"
              className="mt-5 px-5 py-2.5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-[11px] uppercase tracking-wider transition-all duration-200 active:scale-95 no-underline"
            >
              Quay lại Trang Chủ & Đăng Nhập
            </Link>
          </div>
        ) : loadingList ? (
          /* List Loading state */
          <div className="flex-grow flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        ) : watchlist.length > 0 ? (
          /* Grid list items */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-6 gap-y-8">
            {watchlist.map((movie) => (
              <div key={movie.id} className="group flex flex-col gap-2 relative">
                {/* Poster Frame */}
                <div className="relative overflow-hidden rounded-[6px] border border-zinc-900/60 aspect-[2/3] bg-zinc-950 transition-all duration-500 hover:scale-[1.04] hover:border-violet-500/50 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)] shadow-lg">
                  {/* Poster Image link */}
                  <Link href={`/movies/${movie.id}`} className="block w-full h-full relative">
                    <Image
                      src={movie.bannerUrl || movie.posterUrl || '/static/uploads/default_poster.jpg'}
                      alt={movie.title}
                      fill
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw"
                      className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-110"
                    />
                    {/* Gradient overlay for cinematic shadow depth */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050508]/90 via-[#050508]/15 to-transparent opacity-60 transition-opacity duration-300 group-hover:opacity-80" />

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
                  </Link>

                  {/* Quick Action Overlay (Trash Button to remove item) */}
                  <button
                    onClick={(e) => handleRemove(movie.id, e)}
                    disabled={removingId === movie.id}
                    className="absolute bottom-2.5 right-2.5 p-1.5 rounded-[2px] bg-black/80 hover:bg-violet-600 border border-zinc-800/80 text-zinc-400 hover:text-white transition-all z-20 shadow-md cursor-pointer outline-none"
                    title="Xóa khỏi danh sách"
                  >
                    {removingId === movie.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Movie Info (Below the card for visual excellence) */}
                <div className="flex flex-col gap-0.5 mt-1 select-none">
                  <h3 className="text-[12px] font-bold text-white group-hover:text-violet-400 transition-colors truncate leading-tight">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-zinc-550">
                    <span>{movie.releaseYear}</span>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1 py-0.2 rounded-[2px] uppercase">{movie.studio}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Watchlist Empty state */
          <div className="flex-grow flex flex-col items-center justify-center text-center py-20 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-10 max-w-xl mx-auto my-auto shadow-inner select-none">
            <div className="p-4 rounded-[4px] bg-zinc-900 border border-zinc-850 text-zinc-650 mb-4 shadow-sm">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Danh sách chưa có phim nào</h3>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Khám phá thư viện phim Donghua 3D và nhấn nút &quot;+ Danh sách của tôi&quot; để lưu giữ những bộ phim bạn yêu thích nhất.
            </p>
            <Link
              href="/"
              className="mt-5 px-5 py-2.5 rounded-[4px] bg-violet-600 hover:bg-violet-700 text-xs font-extrabold uppercase tracking-wider text-white no-underline flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer border-0 shadow-sm"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Khám Phá Thư Viện Ngay
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
