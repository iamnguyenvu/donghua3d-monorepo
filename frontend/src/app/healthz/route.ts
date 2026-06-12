import { NextResponse } from 'next/server';
import { catalogApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const internalUrl = process.env.INTERNAL_API_URL || 'NOT_SET';
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT_SET';
    
    let fetchError: unknown = null;
    let rawFetchResult: unknown = null;
    try {
      rawFetchResult = await catalogApi.getMovie('the-gioi-hoan-my');
    } catch (e: unknown) {
      fetchError = e instanceof Error ? e.message : String(e);
    }

    return NextResponse.json({
      env: { internalUrl, publicUrl },
      rawFetchResult,
      fetchError
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message });
    }
    return NextResponse.json({ error: 'Unknown error' });
  }
}
