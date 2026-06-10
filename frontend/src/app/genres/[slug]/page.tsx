'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { Play, Star, Film, Loader2 } from 'lucide-react';
import Header from '../../../components/Header';
import { genreApi, MoviePayload, GenrePayload } from '../../../lib/api';

export default function GenrePage() {
  const params = useParams() as { slug: string };
  const [genre, setGenre] = useState<GenrePayload | null>(null);
  const [movies, setMovies] = useState<MoviePayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadGenreData() {
      setLoading(true);
      const res = await genreApi.getGenre(params.slug);
      if (res.success && res.data) {
        setGenre(res.data.genre);
        setMovies(res.data.movies);
        // SEO: Dynamic Title
        document.title = `Phim Thể Loại ${res.data.genre.name} - Donghua 3D Vietsub`;
      } else {
        setErrorMsg('Không tìm thấy thể loại này.');
      }
      setLoading(false);
    }
    loadGenreData();
  }, [params.slug]);

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans pb-24">
      <Header />

      <main className="w-full px-6 md:px-12 lg:px-16 mt-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-900/60 pb-5 mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-wider uppercase border-l-4 border-violet-500 pl-4">
              Thể Loại: <span className="text-violet-400">{genre?.name || 'Đang tải...'}</span>
            </h1>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
          </div>
        ) : errorMsg ? (
          <div className="text-center py-24 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-12 max-w-xl mx-auto">
            <Film className="w-10 h-10 text-zinc-650 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{errorMsg}</h3>
          </div>
        ) : movies.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-x-6 gap-y-8 animate-fade-in-up">
            {movies.map((movie) => (
              <Link href={`/movies/${movie.id}`} key={movie.id} className="no-underline group flex flex-col gap-2">
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

                  <div className="absolute top-2.5 right-2.5 bg-black/80 backdrop-blur-md border border-amber-400/25 text-amber-400 px-1.5 py-1 rounded-[4px] text-[9px] font-extrabold flex items-center gap-0.5 z-10 shadow-md">
                    {movie.rating > 0 ? (
                      <>
                        <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                        {movie.rating.toFixed(1)}
                      </>
                    ) : (
                      <span className="text-[8px] tracking-wider font-extrabold text-amber-400 uppercase">1080P</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 mt-1">
                  <h3 className="text-[12px] font-bold text-white group-hover:text-violet-400 transition-colors truncate leading-tight">
                    {movie.title}
                  </h3>
                  <div className="flex items-center justify-between text-[10px] text-zinc-550 mt-0.5">
                    <span className="text-[10px] text-zinc-400 font-semibold">{movie.releaseYear}</span>
                    <span className="text-[9px] font-bold text-zinc-400 bg-zinc-900 px-1 rounded-[2px] uppercase">{movie.studio || 'Donghua'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-12 max-w-xl mx-auto">
            <Film className="w-10 h-10 text-zinc-650 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Chưa có phim nào</h3>
            <p className="text-xs text-zinc-500 mt-2 max-w-sm mx-auto leading-relaxed">
              Thể loại này hiện chưa có bộ phim nào được cập nhật.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
