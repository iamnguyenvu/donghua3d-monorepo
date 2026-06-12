import { catalogApi } from '@/lib/api';
import HomeClient from './HomeClient';

// Use Incremental Static Regeneration (ISR) to keep homepage fresh every 5 minutes
export const revalidate = 300;

export default async function HomePage() {
  // SSR Fetch movies on the server
  const res = await catalogApi.getMovies().catch(() => ({ success: false, data: [] }));
  const initialMovies = res.success && res.data ? res.data : [];

  return <HomeClient initialMovies={initialMovies} />;
}
