import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', 'host.docker.internal']);

function isAllowedUrl(input: string): boolean {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }
    const host = url.hostname.toLowerCase();
    if (ALLOWED_HOSTS.has(host)) return true;
    return host.endsWith('.kosuke.app');
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  if (!isAllowedUrl(targetUrl)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
  }

  try {
    // Prefer HEAD to avoid downloading body; fallback to GET if HEAD is not supported
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    let res = await fetch(targetUrl, {
      method: 'HEAD',
      redirect: 'manual',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.status === 405 || res.status === 501) {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 4000);
      res = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'manual',
        signal: controller2.signal,
      });
      clearTimeout(timeoutId2);
    }

    // Only ready when status is exactly 200
    return NextResponse.json({ ok: res.status === 200, status: res.status }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, status: 0, error: 'Fetch failed' }, { status: 200 });
  }
}
