# Deploying Pynwheel Connect web

Everything needed to stand this app up on another machine or in production.

The app is a **stateless Next.js server**. It stores nothing: no database, no cache, no
session store. It reads the existing Pynwheel CMS (Rails) over HTTP and holds the Rails session
cookie for the duration of a request. Scaling it means running more copies.

```
Browser ──HTTPS──► Pynwheel Connect (Next.js, :3001) ──HTTP(S)──► Pynwheel CMS (Rails)
                   holds the Rails session cookie httpOnly
```

## 1. Prerequisites

| | Version | Notes |
|---|---|---|
| Node | 22 LTS or newer | `.nvmrc` pins 22; Next 15 needs ≥ 18.18 |
| A running Pynwheel CMS | this branch deployed | the Companies/Properties JSON lives there |
| Network path | Connect host → CMS host | the CMS does **not** need to reach Connect |

There is no database to provision and no migration to run. The Rails side of this feature is
serializers, a query object and two guard clauses — deploy the branch and the JSON endpoints exist.

## 2. Configuration

Copy `.env.example` to `.env.local` (or set real environment variables) and fill in:

| Variable | Required | Meaning |
|---|---|---|
| `PYNWHEEL_CMS_URL` | yes | Base URL of the Rails CMS, e.g. `https://pynwheel-staging.herokuapp.com`. Server-side only. |
| `NEXT_PUBLIC_CMS_URL` | no | Same URL; used only for the "Forgot password?" link. |
| `NEXT_PUBLIC_ENV_LABEL` | no | Text in the header chip. Defaults to `STAGING`. |
| `PYN_CONNECT_COOKIE_SECURE` | no | `false` only when a production build is served over plain HTTP. |

`NEXT_PUBLIC_*` values are baked in at **build** time; the others are read at **run** time. If you
build an image once and promote it between environments, keep the `NEXT_PUBLIC_*` values identical
across them or rebuild per environment.

## 3. Run it

### Node host

```bash
npm ci
npm run build
npm run start          # listens on :3001
```

`next.config.ts` sets `output: 'standalone'`, so you can instead ship `.next/standalone` plus
`.next/static` and `public/` and run `node server.js` — no `node_modules` on the target host.

### Docker

```bash
docker build -t pyn-connect-web .
docker run -p 3001:3001 \
  -e PYNWHEEL_CMS_URL=https://cms.example.com \
  -e NEXT_PUBLIC_CMS_URL=https://cms.example.com \
  pyn-connect-web
```

### Behind a reverse proxy

Terminate TLS at the proxy and forward to `:3001`. Nothing else is required — the app sets no
domain on its cookies and makes no cross-origin browser requests.

## 4. Health check

`GET /api/health` returns `200` when the CMS is reachable and `503` when it is not:

```json
{ "ok": true, "cms": { "url": "https://cms.example.com", "reachable": true, "detail": "HTTP 200" } }
```

Point your platform's readiness probe at it. The Dockerfile already does.

## 5. Security notes

- The browser never receives a Rails cookie. The Next server holds it in an httpOnly,
  SameSite=Lax cookie (`pyn_connect_rails_session`) and replays it server-side.
- Because of that, **there is no CORS configuration and no cross-site cookie setup** on the Rails
  side. If someone proposes adding CORS to make this work, it is not needed.
- Serve production over HTTPS. The session cookies are `Secure` by default; on plain HTTP the
  browser drops them and sign-in appears to succeed but never sticks
  (`PYN_CONNECT_COOKIE_SECURE=false` is the deliberate escape hatch for internal hosts).
- Access control is entirely the CMS's: every listing is scoped by the signed-in user's role, and
  `Users::SessionsController` rejects accounts without `pynwheel_connect_access`.

## 6. Troubleshooting

| Symptom | Cause |
|---|---|
| Sign-in returns "Invalid Email or password." for known-good credentials | `PYNWHEEL_CMS_URL` points at the wrong environment — the account exists in a different database |
| Sign-in succeeds, then every page bounces back to `/sign-in` | Cookies being dropped: production build over plain HTTP. Set `PYN_CONNECT_COOKIE_SECURE=false` or serve HTTPS |
| Lists render empty with no error | The upstream call was answered with a redirect instead of JSON. Devise treats `Accept: */*` as navigational; `base.api.ts` must keep sending `Accept: application/json` |
| `/api/health` returns 503 | The Connect host cannot reach the CMS: DNS, firewall, or a private-network-only CMS |
| "Sorry! you don't have access for Pynwheel Connect" | Correct behaviour — that account has `pynwheel_connect_access = false` in the CMS |
| `next build` fails with `Cannot find module for page: /api/auth/sign-in` | A `next dev` process is sharing `.next`. Stop it, `rm -rf .next`, rebuild |

## 7. What to deploy together

The Rails branch and this app are one change: the app's two listings call `/companies.json` and
`/communities.json`, which only exist on the branch. Deploy Rails first, then Connect.
