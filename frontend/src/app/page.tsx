import { Suspense } from 'react';
import { catalogApi } from '@/lib/api';
import HomeClient from './HomeClient';

// Use Incremental Static Regeneration (ISR) to keep homepage fresh every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  // SSR Fetch movies on the server
  const res = await catalogApi.getMovies().catch(() => ({ success: false, data: [] }));
  const initialMovies = res.success && res.data ? res.data : [];

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/20 border-t-violet-500 animate-spin" />
      </div>
    }>
      <HomeClient initialMovies={initialMovies} />
    </Suspense>
  );
}
