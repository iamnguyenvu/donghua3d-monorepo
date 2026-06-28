'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { newsApi, NewsPayload } from '@/lib/api';
import { Newspaper, Calendar, User, ArrowLeft, Loader2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewsDetailsPage() {
  const params = useParams() as { slug: string };
  const router = useRouter();
  const slug = params.slug;

  const [article, setArticle] = useState<NewsPayload | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch single news item detail
  useEffect(() => {
    if (!slug) return;
    async function loadArticle() {
      setLoading(true);
      try {
        const res = await newsApi.getNewsItem(slug);
        if (res.success && res.data) {
          setArticle(res.data);
        }
      } catch (err) {
        console.error('Error fetching article:', err);
      }
      setLoading(false);
    }
    loadArticle();
  }, [slug]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col font-sans selection:bg-violet-600/30">
      <Header />

      <main className="flex-grow max-w-4xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Navigation back button */}
        <div className="flex items-center gap-3 bg-zinc-900/20 backdrop-blur-md p-3.5 rounded-[4px] border border-zinc-900/60 shadow-xl">
          <button
            onClick={() => router.push('/news')}
            className="p-2 rounded-[4px] bg-zinc-950 border border-zinc-850 hover:border-zinc-700 text-zinc-400 hover:text-white cursor-pointer transition-all outline-none flex items-center justify-center"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-bold uppercase tracking-wider">
            <Newspaper className="w-4 h-4 text-violet-400" />
            <span>Tin Tức Hoạt Hình 3D</span>
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          </div>
        ) : !article ? (
          <div className="bg-[#0b0b14]/30 border border-zinc-900/40 rounded-[4px] py-20 px-4 text-center flex flex-col items-center justify-center shadow-xl">
            <AlertCircle className="w-12 h-12 text-zinc-700 mb-3 animate-pulse" />
            <span className="text-xs text-zinc-400 font-black uppercase tracking-widest">Không tìm thấy bài viết</span>
            <p className="text-xs text-zinc-550 mt-1 max-w-sm">
              Bài viết bạn tìm kiếm có thể đã bị xóa hoặc đường dẫn không chính xác.
            </p>
            <Link 
              href="/news"
              className="mt-6 py-2.5 px-5 bg-violet-600 hover:bg-violet-750 rounded-[4px] border-0 text-white font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-md transition-all active:scale-95"
            >
              Quay lại sảnh tin tức
            </Link>
          </div>
        ) : (
          <article className="bg-[#0b0b14]/75 border border-zinc-900 rounded-[4px] overflow-hidden shadow-2xl flex flex-col gap-6 p-4 md:p-8">
            
            {/* Banner Image */}
            {article.imageUrl && (
              <div className="relative aspect-video w-full rounded-[4px] overflow-hidden bg-zinc-950 border border-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={article.imageUrl} 
                  alt={article.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
              </div>
            )}

            {/* Title Header */}
            <div className="space-y-4 border-b border-zinc-900 pb-5">
              <h1 className="text-lg md:text-2xl font-black leading-snug text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
                {article.title}
              </h1>

              {/* Author & Time details */}
              <div className="flex flex-wrap items-center gap-5 text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-violet-400" />
                  <span>{formatDate(article.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-violet-400" />
                  <span>Tác giả: {article.author}</span>
                </div>
                {article.sourceUrl && (
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-violet-400" />
                    <a 
                      href={article.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-violet-400 hover:text-violet-300 transition-colors no-underline lowercase font-mono"
                    >
                      nguồn ngoài
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Article Content Body (HTML rendering) */}
            <div 
              className="text-zinc-300 text-xs md:text-sm leading-relaxed space-y-4 font-normal tracking-wide prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

          </article>
        )}

      </main>
      <Footer />
    </div>
  );
}
