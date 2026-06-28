'use client';

import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { newsApi, authApi, NewsPayload } from '@/lib/api';
import { Newspaper, Calendar, User, ArrowRight, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NewsListPage() {
  const [news, setNews] = useState<NewsPayload[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);

  // 1. Resolve current user identity to check admin status
  useEffect(() => {
    async function checkRole() {
      const token = localStorage.getItem('donghua3d_token');
      if (token) {
        const res = await authApi.getMe();
        if (res.success && res.data) {
          setIsAdmin(res.data.role === 'ADMIN');
        }
      }
    }
    checkRole();
  }, []);

  // 2. Fetch all news articles from API
  async function loadNews() {
    setLoading(true);
    try {
      const res = await newsApi.getNewsList();
      if (res.success && res.data) {
        setNews(res.data);
      }
    } catch (err) {
      console.error('Error fetching news:', err);
    }
    setLoading(false);
  }

  useEffect(() => {
    setTimeout(() => {
      loadNews();
    }, 0);
  }, []);

  // 3. Trigger manual RSS sync (Admin only)
  const handleSyncNews = async () => {
    setSyncing(true);
    try {
      const res = await newsApi.syncNews();
      if (res.success) {
        alert(`🔔 Đồng bộ thành công! Đã nạp thêm ${res.data?.count ?? 0} tin tức mới.`);
        await loadNews(); // reload lists
      } else {
        alert('💥 Đồng bộ thất bại. Vui lòng kiểm tra lại log hệ thống.');
      }
    } catch (err) {
      alert(`💥 Lỗi đồng bộ: ${err instanceof Error ? err.message : String(err)}`);
    }
    setSyncing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-[#06060c] text-white flex flex-col font-sans selection:bg-violet-600/30">
      <Header />

      <main className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 flex flex-col gap-6">
        
        {/* Banner Section */}
        <div className="relative overflow-hidden rounded-lg border border-zinc-900/60 bg-zinc-950/20 backdrop-blur-md p-6 md:p-10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 translate-y-12 -translate-x-12 w-64 h-64 bg-pink-600/5 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3 z-10">
            <div className="flex items-center gap-2">
              <Newspaper className="w-5 h-5 text-violet-400" />
              <span className="text-xs font-black uppercase tracking-widest text-violet-400">Động Phủ Tin Tức</span>
            </div>
            <h1 className="text-xl md:text-3xl font-black uppercase tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400">
              Tin Tức & Sự Kiện Donghua 3D
            </h1>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Cập nhật thông tin nhanh nhất về lịch ra mắt phim, phần tiếp theo của các bộ 3D hot, 
              sự kiện của các Studio sản xuất lớn (Tencent, Bilibili, Foch Film, Original Force).
            </p>
          </div>

          {/* Admin Sync Action Button */}
          {isAdmin && (
            <button
              onClick={handleSyncNews}
              disabled={syncing}
              className="z-10 py-3 px-6 rounded-[4px] bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-750 hover:to-pink-700 text-white font-black text-xs uppercase tracking-widest cursor-pointer shadow-[0_0_20px_rgba(139,92,246,0.25)] flex items-center gap-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed outline-none border-0"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>{syncing ? 'Đang đồng bộ...' : 'Cào Tin Mới'}</span>
            </button>
          )}
        </div>

        {/* News List Content Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
          </div>
        ) : news.length === 0 ? (
          <div className="bg-[#0b0b14]/30 border border-zinc-900/40 rounded-[4px] py-20 px-4 text-center flex flex-col items-center justify-center shadow-xl">
            <AlertCircle className="w-12 h-12 text-zinc-700 mb-3 animate-pulse" />
            <span className="text-xs text-zinc-400 font-black uppercase tracking-widest">Chưa có tin tức</span>
            <p className="text-xs text-zinc-550 mt-1 max-w-sm">
              Hệ thống tin tức đang được bảo trì. Vui lòng quay lại sau!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {news.map((item) => (
              <div 
                key={item.id} 
                className="group bg-[#0b0b14]/75 border border-zinc-900 hover:border-violet-500/30 rounded-[4px] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-[0_4px_30px_rgba(139,92,246,0.1)]"
              >
                
                {/* Image Wrap */}
                <div className="relative aspect-video w-full bg-zinc-950 overflow-hidden border-b border-zinc-900">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                      src={item.imageUrl} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">
                      No Thumbnail
                    </div>
                  )}
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
                </div>

                {/* Article Body */}
                <div className="p-4 flex-grow flex flex-col gap-3 justify-between">
                  <div className="space-y-2">
                    
                    {/* Meta info */}
                    <div className="flex items-center gap-4 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-violet-400" />
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-violet-400" />
                        <span className="truncate max-w-[90px]">{item.author}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <Link 
                      href={`/news/${item.slug}`}
                      className="text-sm font-black text-zinc-200 group-hover:text-violet-400 transition-colors line-clamp-2 no-underline"
                    >
                      {item.title}
                    </Link>

                    {/* Summary */}
                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">
                      {item.summary}
                    </p>
                  </div>

                  {/* Read More button */}
                  <Link 
                    href={`/news/${item.slug}`}
                    className="mt-4 py-2 px-3 rounded-[2px] bg-zinc-950 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-750 text-zinc-400 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all no-underline flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Xem bài viết</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                </div>

              </div>
            ))}
          </div>
        )}

      </main>
      <Footer />
    </div>
  );
}
