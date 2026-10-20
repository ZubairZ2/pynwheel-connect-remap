import { NextResponse, type NextRequest } from 'next/server';

import { baseURLGenerator } from '~/config/app/urls';

export const dynamic = 'force-dynamic';

/**
 * The property's public booking link (`Scheduling::Settings#link`) points at
 * this app when the CMS has no `HOST_URL`; the booking widget itself is the
 * CMS's page, so the visitor is sent there with the same signed query
 * (`community_id`, `community_code`, `direct`). Nothing is read or written here.
 */
export function GET(request: NextRequest) {
  const target = new URL('/scheduler_widget/test_widget', baseURLGenerator());
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, 302);
}
