'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Tag, ChevronRight } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { genreApi, GenrePayload } from '../../lib/api';

export default function GenresListPage() {
  const [genres, setGenres] = useState<GenrePayload[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGenres() {
      setLoading(true);
      const res = await genreApi.getGenres();
      if (res.success && res.data) {
        setGenres(res.data);
        document.title = 'Tất Cả Thể Loại Phim - Donghua3D';
      }
      setLoading(false);
    }
    loadGenres();
  }, []);

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 flex flex-col font-sans">
      <Header />

      <main className="w-full px-6 md:px-12 lg:px-16 mt-10">
        <div className="border-b border-zinc-900/60 pb-5 mb-8">
          <h1 className="text-2xl font-black text-white tracking-wider uppercase border-l-4 border-violet-500 pl-4">
            Tất Cả Thể Loại
          </h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-2 pl-5">
            {genres.length > 0 ? `${genres.length} thể loại` : 'Đang tải...'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-violet-500" />
          </div>
        ) : genres.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 animate-fade-in-up">
            {genres.map((genre) => (
              <Link
                key={genre.id}
                href={`/genres/${genre.slug}`}
                className="group flex flex-col justify-between p-5 bg-zinc-950/60 border border-zinc-900/80 rounded-[6px] hover:border-violet-500/50 hover:bg-zinc-900/40 transition-all duration-300 no-underline hover:shadow-[0_0_20px_rgba(139,92,246,0.15)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-violet-500 flex-shrink-0" />
                    <span className="text-sm font-bold text-white group-hover:text-violet-400 transition-colors truncate">
                      {genre.name}
                    </span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-violet-400 transition-colors flex-shrink-0 mt-0.5" />
                </div>
                {genre._count?.movies !== undefined && (
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-3">
                    {genre._count.movies} phim
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-zinc-950/40 border border-zinc-900 rounded-[4px] p-12 max-w-xl mx-auto">
            <Tag className="w-10 h-10 text-zinc-650 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Chưa có thể loại nào</h3>
            <p className="text-xs text-zinc-500 mt-2">Hệ thống chưa có dữ liệu thể loại.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
