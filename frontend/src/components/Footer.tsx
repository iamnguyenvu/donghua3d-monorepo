'use client';

import React from 'react';
import Link from 'next/link';
import { Film, Compass, Award, Heart, HelpCircle } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#050508] border-t border-zinc-900/60 mt-auto select-none">
      <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-6 md:px-12 lg:px-16 py-12 md:py-16 flex flex-col gap-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 text-white no-underline group">
              <div className="p-1.5 rounded-[4px] bg-violet-600 flex items-center justify-center transition-all duration-300 group-hover:bg-violet-500 shadow-md">
                <Film className="w-4 h-4 text-white" />
              </div>
              <span className="font-sans font-black text-base tracking-wider text-white">
                DONGHUA<span className="text-violet-500">3D</span>
              </span>
            </Link>
            <p className="text-xs text-zinc-500 leading-relaxed max-w-xs">
              Đỉnh cao hoạt hình 3D Trung Quốc. Bảng xếp hạng Tier List uy tín được đánh giá bởi các chuyên gia và cộng đồng đam mê Donghua Việt Nam.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-violet-500" />
              Khám Phá
            </span>
            <div className="flex flex-col gap-2 text-xs">
              <Link href="/" className="text-zinc-500 hover:text-white transition-colors no-underline">Trang Chủ</Link>
              <Link href="/leaderboard" className="text-zinc-500 hover:text-white transition-colors no-underline">Bảng Xếp Hạng</Link>
              <Link href="/watchlist" className="text-zinc-500 hover:text-white transition-colors no-underline">Danh Sách Của Tôi</Link>
            </div>
          </div>

          {/* Guidelines / Help */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-violet-500" />
              Hỗ Trợ
            </span>
            <div className="flex flex-col gap-2 text-xs">
              <Link href="/watchlist" className="text-zinc-500 hover:text-white transition-colors no-underline">Điều Khoản Dịch Vụ</Link>
              <Link href="/leaderboard" className="text-zinc-500 hover:text-white transition-colors no-underline">Chính Sách Bảo Mật</Link>
              <Link href="/" className="text-zinc-500 hover:text-white transition-colors no-underline">Liên Hệ DMCA</Link>
            </div>
          </div>

          {/* Community stats or message */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-violet-500" />
              Tiêu Chuẩn
            </span>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Tất cả các lượt xếp hạng và thảo luận được kiểm duyệt nghiêm ngặt nhằm xây dựng một cộng đồng thảo luận lành mạnh, có văn hóa.
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-900/60 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 text-xs text-zinc-650">
            <span>© {currentYear} Donghua3D.me. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-zinc-650 font-bold uppercase tracking-widest">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
            <span>for Donghua Fans</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
