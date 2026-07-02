import { Suspense } from 'react';
import OngoingClient from './OngoingClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Phim Hoạt Hình 3D Trung Quốc Đang Chiếu | Donghua3D',
  description: 'Danh sách các bộ phim hoạt hình 3D Trung Quốc đang chiếu (ongoing) được cập nhật liên tục, vietsub chất lượng cao, thuyết minh nhanh nhất.',
};

export default function OngoingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
      </div>
    }>
      <OngoingClient />
    </Suspense>
  );
}
