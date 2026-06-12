import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const internalUrl = process.env.INTERNAL_API_URL || 'NOT_SET';
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT_SET';
    
    let fetchError: unknown = null;
    let rawFetchResult: unknown = null;
    try {
      const urlToFetch = internalUrl !== 'NOT_SET' ? internalUrl : 'http://backend:5000';
      const res = await fetch(`${urlToFetch}/catalog/movies/the-gioi-hoan-my`);
      rawFetchResult = {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data: await res.text(),
      };
    } catch (e: unknown) {
      if (e instanceof Error) {
        fetchError = { message: e.message, stack: e.stack, name: e.name };
      } else {
        fetchError = String(e);
      }
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
