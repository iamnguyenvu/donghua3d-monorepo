import { tierApi, catalogApi } from '@/lib/api';
import LeaderboardClient from './LeaderboardClient';
import { Metadata } from 'next';

export const revalidate = 600; // 10 minutes

export const metadata: Metadata = {
  title: 'Bảng Xếp Hạng Phim Hoạt Hình 3D Trung Quốc | Donghua3D',
  description: 'Bảng xếp hạng (Tier List) phim hoạt hình 3D Trung Quốc được đánh giá bởi cộng đồng. Khám phá những siêu phẩm Donghua S-Tier đỉnh cao nhất.',
};

export default async function LeaderboardPage() {
  const [leadRes, movieRes] = await Promise.all([
    tierApi.getLeaderboard().catch(() => ({ success: false, data: [] })),
    catalogApi.getMovies().catch(() => ({ success: false, data: [] }))
  ]);

  const initialLeaderboard = leadRes.success && leadRes.data ? leadRes.data : [];
  const initialMovies = movieRes.success && movieRes.data ? movieRes.data : [];

  return (
    <LeaderboardClient 
      initialLeaderboard={initialLeaderboard} 
      initialMovies={initialMovies} 
    />
  );
}
