import { redirect } from 'next/navigation';

import { APP_ROUTES } from '~/config/app/urls';
import { readRailsCookie } from '~/core/session/session.server';

export default async function RootPage() {
  const cookie = await readRailsCookie();
  redirect(cookie ? APP_ROUTES.properties : APP_ROUTES.signIn);
}
