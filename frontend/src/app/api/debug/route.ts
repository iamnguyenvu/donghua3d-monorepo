import { NextResponse } from 'next/server';
import { catalogApi } from '@/lib/api';

export async function GET() {
  try {
    const internalUrl = process.env.INTERNAL_API_URL || 'NOT_SET';
    const publicUrl = process.env.NEXT_PUBLIC_API_URL || 'NOT_SET';
    
    let fetchError = null;
    let rawFetchResult = null;
    try {
      const res = await fetch(`${internalUrl || 'http://backend:5000'}/catalog/movies/the-gioi-hoan-my`);
      rawFetchResult = {
        status: res.status,
        statusText: res.statusText,
        ok: res.ok,
        data: await res.text(),
      };
    } catch (e: any) {
      fetchError = { message: e.message, stack: e.stack, cause: e.cause };
    }

    const apiRes = await catalogApi.getMovie('the-gioi-hoan-my');

    return NextResponse.json({
      env: { internalUrl, publicUrl },
      rawFetchResult,
      fetchError,
      apiRes
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack });
  }
}
