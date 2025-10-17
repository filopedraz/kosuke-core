import { NextRequest, NextResponse } from 'next/server';

// GET /api/preview/health?url=<encoded>&timeout=<ms>
// Performs a server-side HEAD (falling back to GET) to the provided URL and
// returns whether the upstream responds with HTTP 200. This avoids browser
// CORS/no-cors limitations so the client can reliably wait for a 200.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const timeoutParam = searchParams.get('timeout');
    const timeout = Number(timeoutParam) > 0 ? Number(timeoutParam) : 3000;

    if (!url) {
      return NextResponse.json({ ok: false, error: 'Missing url parameter' }, { status: 400 });
    }

    // Basic SSRF guard: only allow http/https and limit to kosuke.app or localhost
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid URL' }, { status: 400 });
    }

    const host = parsed.hostname;
    const isAllowedProtocol = parsed.protocol === 'https:' || parsed.protocol === 'http:';
    const isAllowedHost =
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.kosuke.app') ||
      host === 'kosuke.app';

    if (!isAllowedProtocol || !isAllowedHost) {
      return NextResponse.json({ ok: false, error: 'URL not allowed' }, { status: 400 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    // Try HEAD first, then fallback to GET if HEAD not supported
    let status = 0;
    try {
      const headResponse = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
      });
      status = headResponse.status;
    } catch {
      // ignore, fallback to GET below
    }

    if (status === 0 || status === 405 || status === 501) {
      try {
        const getResponse = await fetch(url, {
          method: 'GET',
          redirect: 'manual',
          // Hint to not download full content; not all servers honor Range, but it's harmless
          headers: { Range: 'bytes=0-0' },
          signal: controller.signal,
        });
        status = getResponse.status;
      } catch {
        // Network error or aborted
        clearTimeout(timer);
        return NextResponse.json({ ok: false, status: 0 });
      }
    }

    clearTimeout(timer);

    // Only consider the app healthy when it returns 200 OK
    const ok = status === 200;
    return NextResponse.json({ ok, status });
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
