# Pynwheel Connect — web (Next.js)

The Pynwheel Connect back office, rendering the design in `../pyn-connect-new.html`.

Two kinds of screen live here, and the difference matters:

- **Sign In, Companies, Properties** read **real data** from the existing Pynwheel CMS (Rails)
  application. No second backend, no new authentication system.
- **Every other screen** — Dashboard, the property and company detail screens, Tour Scheduling,
  Integrations, the Pricing Calculator and the rest — runs on **local demo data** under
  `src/data/mock/`. They do not touch the database. Swapping one to a real endpoint means adding a
  thunk that writes parsed models into the same Redux slice; nothing above the slice changes.

```
Browser ── Next.js (server components + route handlers) ── Rails CMS (Devise session)
                   └── demo slice (src/data/mock) for the ported screens
```

## Running it

```bash
cp .env.example .env.local        # PYNWHEEL_CMS_URL → your running Rails app
npm install
npm run dev                       # http://localhost:3001
```

The Rails app must be running (`bundle exec rails s -p 3000` in the repo root).

To stand this up on another machine or in production — Node/Docker, environment variables, the
health probe, HTTPS and cookie requirements, troubleshooting — see [DEPLOYMENT.md](DEPLOYMENT.md).

| Variable | Meaning |
|---|---|
| `PYNWHEEL_CMS_URL` | Base URL of the Rails CMS. Server-side only. |
| `NEXT_PUBLIC_CMS_URL` | Same URL, used only for the "Forgot password?" link. |
| `NEXT_PUBLIC_ENV_LABEL` | Text in the environment chip (defaults to `STAGING`). |
| `PYN_CONNECT_COOKIE_SECURE` | `false` only when a production build is served over plain HTTP. |
| `PYN_CONNECT_REACT_FLOW` | `off` sends every Connect route to the legacy Rails UI. See `src/config/app/reactFlow.ts`. |
| `NEXT_PUBLIC_SCREEN_HARNESS` | `on` exposes `/screen-harness/<screen>` in a production build. Used by the end-to-end suite; off by default. |

## Tests

```bash
npm run test:e2e     # Playwright, real Chrome
npm run typecheck
npm run build
```

`tests/e2e/` covers every route, every ported screen (asserting **no** console errors), and the
interactions the design demonstrates — tabs, search, filters, dialogs, confirm-before-destroy,
toggles, plotting a pin, and the layout at phone width.

## How it is layered

The layering is the one documented in `../react-architecture.md`, adapted to the App Router. Each
layer may only talk to the layer beneath it.

| Layer | Path | Responsibility |
|---|---|---|
| Route | `src/app/**/page.tsx` | Thin entry: reads the session cookie, calls an API module, hands models to a screen |
| Screen | `src/core/screens/**` | Picks the hook and the template; no fetching |
| Template | `src/core/templates/**` | `ListingScreenTemplate` (header) and `ResourceListingTemplate` (toolbar + table) |
| Hook | `src/core/hooks/**` | Filter state + generator calls, returns descriptors |
| Generator | `src/core/utils/generator/**` | Pure context → descriptors (columns, rows, pill variants, filter options) |
| Component | `src/core/components/{atoms,molecules,organisms}` | `StatusPill`, `SearchField`, `CustomTable`, `Sidebar`, `Navbar` |
| API module | `src/core/repository/remote/api/**` | One function per Rails endpoint, over `base.api.ts` |
| Parser | `src/core/repository/parser/**` | Unwraps `{ data, meta, flash_messages }`, converts snake_case → camelCase |
| Model | `src/core/models/data/**` | camelCase TypeScript interfaces |

**Rules:** only route handlers and server components call API modules; components never fetch;
generators never hold state; nothing outside a parser ever sees a snake_case key.

## Authentication

`POST /api/auth/sign-in` drives the **existing Devise flow** server-side:

1. `GET /users/sign_in` → CSRF token + cookie
2. `POST /users/sign_in` with `user[email]`, `user[password]`, `user[remember_me]`,
   `authenticity_token`, `commit` — exactly what `app/views/devise/sessions/new.html.haml` submits
3. 200 ⇒ wrong credentials (the flash is scraped from the re-rendered form);
   302 ⇒ accepted, then verified with a real JSON call because
   `Users::SessionsController#create` signs the user back out when
   `pynwheel_connect_access` is false and still redirects
4. The Rails cookie is stored in an httpOnly cookie (`pyn_connect_rails_session`) and replayed
   on every server-side call. The browser never holds a Rails cookie, so there is no CORS
   surface and no cross-site cookie configuration.

`POST /api/auth/sign-out` calls `DELETE /users/sign_out` (Devise's `sign_out_via = :delete`) and
clears both cookies.

## Endpoints it reads

| Screen | Endpoint | Rails |
|---|---|---|
| Companies | `GET /companies.json` | `CompaniesController#index` |
| Properties | `GET /communities.json` | `CommunitiesController#index` → `AccessibleCommunitiesQuery` |

Both return `{ data, meta: { total_count, current_user }, flash_messages }`.
