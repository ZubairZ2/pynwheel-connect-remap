import { NextResponse } from 'next/server';

import { baseURLGenerator, CORE_URLS } from '~/config/app/urls';

export const dynamic = 'force-dynamic';

/**
 * Readiness probe for deployments: reports whether this app is up and whether
 * it can actually reach the Rails CMS it reads from. A 503 here almost always
 * means PYNWHEEL_CMS_URL is wrong or unreachable from this host.
 */
export async function GET(): Promise<NextResponse> {
  const cmsUrl = baseURLGenerator();
  let reachable = false;
  let detail: string | null = null;

  try {
    const response = await fetch(`${cmsUrl}${CORE_URLS.auth.signIn}`, {
      method: 'HEAD',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });

    reachable = response.status < 500;
    detail = `HTTP ${response.status}`;
  } catch (error) {
    detail = error instanceof Error ? error.message : 'unreachable';
  }

  return NextResponse.json(
    { ok: reachable, cms: { url: cmsUrl, reachable, detail } },
    { status: reachable ? 200 : 503 }
  );
}
