import { Suspense } from 'react';
import CompletedClient from './CompletedClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Phim Hoạt Hình 3D Trung Quốc Trọn Bộ | Hoàn Thành | Donghua3D',
  description: 'Danh sách các bộ phim hoạt hình 3D Trung Quốc đã hoàn thành trọn bộ, xem phim chất lượng cao 1080p/4K mượt mà không quảng cáo.',
};

export default function CompletedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
      </div>
    }>
      <CompletedClient />
    </Suspense>
  );
}
