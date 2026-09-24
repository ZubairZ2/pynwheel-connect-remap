import 'server-only';

import { CORE_URLS } from '~/config/app/urls';
import { apiRequest, mergeCookies, type ApiResponse } from './base.api';

/**
 * The existing Devise flow, driven from the server — no new authentication
 * system, no change to `Users::SessionsController`.
 *
 *   1. GET  /users/sign_in   → CSRF token (`csrf-token` meta) + a session cookie
 *   2. POST /users/sign_in   → form-encoded `user[email]` / `user[password]` /
 *                              `user[remember_me]` / `authenticity_token`,
 *                              exactly what the HAML form submits
 *   3. 302 → credentials accepted; 200 → the form re-rendered with a flash
 */
export interface SignInAttempt {
  redirected: boolean;
  cookie: string;
  html: string;
  status: number;
}

export const fetchSignInPage = async (): Promise<{ token: string; cookie: string }> => {
  const response = await apiRequest<string>(CORE_URLS.auth.signIn, {
    accept: 'text/html,application/xhtml+xml',
    parseJson: false,
    redirect: 'follow'
  });

  return {
    token: extractCsrfToken(response.text),
    cookie: mergeCookies(null, response.setCookie)
  };
};

export const postSignIn = async (params: {
  email: string;
  password: string;
  rememberMe: boolean;
  token: string;
  cookie: string;
}): Promise<SignInAttempt> => {
  const body = new URLSearchParams({
    authenticity_token: params.token,
    'user[email]': params.email,
    'user[password]': params.password,
    'user[remember_me]': params.rememberMe ? '1' : '0',
    commit: 'Log In'
  }).toString();

  const response = await apiRequest<string>(CORE_URLS.auth.signIn, {
    method: 'POST',
    body,
    cookie: params.cookie,
    contentType: 'application/x-www-form-urlencoded',
    accept: 'text/html,application/xhtml+xml',
    parseJson: false,
    redirect: 'manual'
  });

  return {
    redirected: response.status >= 300 && response.status < 400,
    cookie: mergeCookies(params.cookie, response.setCookie),
    html: response.text,
    status: response.status
  };
};

/** DELETE /users/sign_out — Devise is configured with `sign_out_via = :delete`. */
export const postSignOut = (cookie: string | null): Promise<ApiResponse<string>> =>
  apiRequest<string>(CORE_URLS.auth.signOut, {
    method: 'DELETE',
    cookie,
    accept: 'text/html,application/xhtml+xml',
    parseJson: false,
    redirect: 'manual'
  });

/** Re-reads the login page so a `flash[:error]` set by a redirect is visible. */
export const fetchFlashMessage = async (cookie: string): Promise<string | null> => {
  const response = await apiRequest<string>(CORE_URLS.auth.signIn, {
    cookie,
    accept: 'text/html,application/xhtml+xml',
    parseJson: false,
    redirect: 'follow'
  });

  return extractFlashMessage(response.text);
};

const extractCsrfToken = (html: string): string => {
  const match = html.match(/name="csrf-token"\s+content="([^"]*)"/);
  return match ? match[1] : '';
};

/**
 * The legacy layout renders flashes as `<div class="alert ...">message</div>`
 * inside `#flash-message` (app/views/_messages.html.haml).
 */
export const extractFlashMessage = (html: string): string | null => {
  const match = html.match(/class=["']alert[^"']*["']\s*>([^<]+)</);
  if (!match) return null;

  const message = decodeEntities(match[1]).trim();
  return message.length > 0 ? message : null;
};

const decodeEntities = (value: string): string =>
  value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
