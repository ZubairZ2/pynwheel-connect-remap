# Pynwheel Tour App API (`tour-api/`)

The FastAPI service the **Pynwheel Tour** mobile app (`tour-app/`) talks to.

```
Capacitor Tour App
      ↓  HTTPS, Authorization: Bearer <token>
FastAPI Tour API  (this directory)
      ↓  read-only SQL                ↓  two HTTP calls
Pynwheel Postgres database         Rails CMS: Doorkeeper sign-in / sign-out
```

* **Sign-in** is the CMS's own Doorkeeper password grant (`POST /api/v2/auth/token`):
  Devise verifies the password; this service never sees a hash and only admits
  accounts whose role is **Super admin**. The token the app receives *is* the CMS
  access token; every request is validated against `oauth_access_tokens`
  (revocation and expiry are the CMS's).
* **Data** is read from the same database the CMS uses, over connections that
  are forced read-only (`default_transaction_read_only=on`). Properties, the
  Self-Guided Tour flag (`Connect::ProductState.tour?` mirrored), the stops list
  (`TourStops::Membership.in_list?` mirrored), maps and the wayfinding graph.
* **Routing** is a line-for-line Python port of the CMS's `Wayfinding::GraphBuilder`,
  `RouteService` and `Timing` (`app/wayfinding/`). `scripts/parity.py` proves it
  equal to the Rails Tour App API on real properties (graph payload, every
  route, the tour route).
* **No Rails code was changed.** The legacy CMS, Connect and the existing
  self-tour API behave exactly as before.

Full documentation: [`../tour-app-backend-api.md`](../tour-app-backend-api.md).

## Run

```bash
cd tour-api
python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt
cp .env.example .env        # database URL, Rails URL, CORS origins
./.venv/bin/uvicorn app.main:app --reload --port 8000
open http://127.0.0.1:8000/docs
```

The app's launch config `tour-api` (`.claude/launch.json`) does the same.

## Test

```bash
./.venv/bin/python -m pytest                       # unit tests, no database
./.venv/bin/python scripts/parity.py 1411 1618 2934 --rails http://127.0.0.1:3100   # vs the Rails API (verify server)
EMAIL=... PASSWORD=... ./.venv/bin/python scripts/measure.py 1411 1618              # live timings and payload sizes
```

## Layout

```
app/main.py              FastAPI app, CORS, access log, /api/v1/health
app/config.py            Settings (TOUR_API_* environment)
app/errors.py            one error envelope for everything
app/container.py         wiring
app/api/deps.py          bearer → Super Admin; property → access + tour gate
app/api/v1/              routers: auth, properties, stops, maps (map / level / graph), routes (route / tour-route / distances)
app/schemas/             Pydantic request/response models (the OpenAPI contract)
app/services/            auth, properties, stops, maps, routing (route-step adapter)
app/repositories/        read-only SQL: db pool, users/tokens, properties, stops, rubyisms (present?, product_options)
app/integrations/rails.py  Doorkeeper sign-in / sign-out
app/wayfinding/          rows loader, graph_builder, route_service, timing, graph_serializer, graph_version, engine (cache), upload_url
scripts/parity.py        FastAPI vs Rails equivalence harness
scripts/measure.py       live performance measurement
tests/                   pytest suite (fixture graph, fakes for DB and Rails)
```

## Deploy

The service is a plain ASGI app; `Procfile` starts it with uvicorn (Heroku-style). Set these in the
deployment environment (nothing is read from a committed file):

| Variable | Production value |
|---|---|
| `TOUR_API_DATABASE_URL` | the CMS's Postgres URL; the service only ever reads (`default_transaction_read_only=on`) |
| `TOUR_API_RAILS_URL` | the CMS base URL (sign-in / sign-out only), e.g. `https://pyn-system.herokuapp.com` |
| `TOUR_API_PUBLIC_UPLOADS_URL` | same as the CMS URL (upload paths without an S3 copy) |
| `TOUR_API_CORS_ORIGINS` | `capacitor://localhost,https://localhost,http://localhost,ionic://localhost` (the Capacitor web view origins; add a web host if the app is also served on the web) |
| `TOUR_API_ENV` | `production` (hides `/docs`, `/redoc`, `/openapi.json`) |
| `TOUR_API_LOG_LEVEL` | `INFO` |

Serve it over **https**: the mobile release build keeps the web view strict (no mixed content, no
cleartext), so a plain-http API only works for development builds. The mobile app is built with
`VITE_TOUR_API_URL=https://<this service> npm run build && npx cap sync` (see `tour-app/.env.production`).
