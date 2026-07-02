import { Suspense } from 'react';
import TopRatedClient from './TopRatedClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Siêu Phẩm Hoạt Hình 3D Trung Quốc Đánh Giá Cao | Donghua3D',
  description: 'Bảng xếp hạng phim hoạt hình 3D Trung Quốc được đánh giá cao nhất bởi cộng đồng người xem và các chuyên gia tu tiên.',
};

export default function TopRatedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
      </div>
    }>
      <TopRatedClient />
    </Suspense>
  );
}
