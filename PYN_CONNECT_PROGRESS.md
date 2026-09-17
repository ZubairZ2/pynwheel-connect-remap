# Pynwheel Connect — progress and handoff

**Last updated:** September 17, 2026 (phase 2)
**Read this first if you are starting a new session on this work.**

---

## 1. What this is

**Pynwheel Connect**, the new back office, as a Next.js app in `pyn-connect-web/`.

**Phase 1** — brief [feature1.md](feature1.md), branch `feat/pyn-connect-initial-screens`, merged
into the base of phase 2. Three screens — **Sign In**, **Companies**, **Properties** — reading the
**existing Pynwheel CMS (Rails) backend in this repository**. Real data only; no second backend, no
new authentication system, no mock data. Complete and pushed.

**Phase 2** — brief [feature-whole-ui-next.md](feature-whole-ui-next.md), branch
`feat/pyn-connect-full-ui`. The rest of the design: 29 more screens and 9 dialogs ported from
`pyn-connect-new.html`, driven entirely by **local demo data**. No schema change, no migration, no
new controller or endpoint, and the phase-1 screens are untouched. See §12 below.

**Status: complete.** 80 Playwright tests green, `tsc --noEmit` clean, `next build` clean.

## 2. The three input files

| File | What it is | How to read it |
|---|---|---|
| `feature1.md` | The brief | Plain markdown |
| `react-architecture.md` | The architecture doc to follow **and keep updated** | Sections 1–19 describe the **ezofficeinventory** React SPA (a *different* repo, `/Users/zubairzulifqar/ezofficeinventory`). Section 20 is the running log of this implementation |
| `pyn-connect-new.html` | The UI design, 20 MB | **Not readable as plain HTML.** It is a bundled page: markup lives in a `<script type="__bundler/template">` island and images are base64 in `<script type="__bundler/manifest">`, referenced by UUID. Extract with a small Python script (see §8) |

`/Users/zubairzulifqar/ezofficeinventory` is the reference implementation for layering questions.
`/Users/zubairzulifqar/pyn-system` is a *separate* future monorepo — **not** where this work went.

## 3. Decisions the user made

Asked and answered at the start; do not re-litigate these:

1. **Where the app lives** → a new app in this repo, `pyn-connect-web/`, not in `pyn-system`.
2. **How Sign In authenticates** → Next.js server-side proxy holding the Devise session cookie.
   No CORS, no new auth backend.
3. **How data reaches the UI** → `format.json` on the *existing* controllers, not a new API
   namespace.
4. **Properties scope** → all communities the signed-in user may see. For a super admin that is
   every real community (802 locally), matching the legacy Home screen, *not* the
   `current_company` scope of `CommunitiesController#index`'s HTML path.

## 4. What was built

### Rails side (this repo)

| File | Purpose |
|---|---|
| `app/queries/accessible_communities_query.rb` | The "which communities may this user see" role rules, extracted from `HomeController#index` |
| `app/serializers/connect/response_envelope.rb` | `{ data, meta, flash_messages }`; `meta.current_user` rides along on every listing |
| `app/serializers/connect/company_serializer.rb` | Company rows; four association counts via one grouped query each |
| `app/serializers/connect/property_serializer.rb` | Community rows; lifecycle stage, product flags, integration states |
| `app/controllers/companies_controller.rb` | One added line: `render_connect_companies if request.format.json?` |
| `app/controllers/communities_controller.rb` | One added guard: `return render_connect_properties if request.format.json? && params[:enable_communities].blank?` |

No schema change, no migration, no route change, no auth change. HTML paths are untouched.

Endpoints: `GET /companies.json`, `GET /communities.json`. Both require a Devise session.

### Next.js side — `pyn-connect-web/`

Next 15 App Router, React 19, TypeScript, plain CSS with the design's tokens. Runs on **:3001**.

Layering mirrors `react-architecture.md`, adapted to the App Router:

```
route (server component) → API module → parser → model → screen → hook → generator → template → component
```

- `src/config/app/urls.ts` — every Rails path (`CORE_URLS`) plus `baseURLGenerator`
- `src/core/repository/remote/api/` — `base.api.ts` (the only place that calls `fetch`), plus
  `auth`, `companies`, `properties`
- `src/core/repository/parser/` — unwrap envelope, snake_case → camelCase
- `src/core/utils/generator/` — pure descriptor builders (columns, rows, pill variants, filters)
- `src/core/{screens,templates,components,hooks}` — presentation
- `src/app/api/auth/{sign-in,sign-out}/route.ts`, `src/app/api/health/route.ts`

**Rules carried over:** only route handlers and server components touch the network; components
never fetch; generators never hold state; parsers are the only place a snake_case key exists.

**Deliberately not ported:** Redux. With no detail panes or dialogs in this phase there is no
cross-tree state to hold; filter state is `useState` in the hook. If dialogs arrive, §9 of the
architecture doc applies as written.

## 5. Non-obvious things discovered (the expensive ones)

1. **A failed Devise sign-in answers HTTP 200, not 302.** It re-renders the form with
   `flash.now[:alert]`, so the error text must be scraped from *that* response body — a follow-up
   GET shows nothing, because `flash.now` does not persist.
2. **A successful sign-in POST does not mean a session exists.**
   `Users::SessionsController#create` signs the user back out when `pynwheel_connect_access` is
   false and *still* redirects. The route handler therefore verifies with a real authenticated JSON
   call before trusting the cookie.
3. **`Accept: application/json` is load-bearing.** Devise's `navigational_formats` defaults to
   `['*/*', :html]`, so a request accepting `*/*` gets a 302 to the login page instead of a 401 —
   the app would render an empty list with no error.
4. **`communities.product_options` is a jsonb column holding a JSON *string*.** Parse twice.
5. **The design's images are inside the file's bundler manifest**, not on disk. Four were extracted
   to `pyn-connect-web/public/images/`.
6. **Session cookies are `Secure` in production.** A production build served over plain HTTP drops
   them: sign-in returns 200 and every page bounces back to `/sign-in`. Escape hatch:
   `PYN_CONNECT_COOKIE_SECURE=false`.
7. **`next build` and `next dev` fight over `.next`.** A build while dev is running fails with
   `Cannot find module for page: /api/auth/sign-in`. Stop dev, `rm -rf .next`, rebuild.
8. **Use the RVM ruby, not rbenv.** The gems are built against
   `/Users/zubairzulifqar/.rvm/rubies/ruby-3.3.5/bin`; rbenv's 3.3.5 fails with
   `linked to incompatible libruby`.

## 6. Design → database mapping

Recorded in full in `react-architecture.md` §20. Summary:

| Design field | Source |
|---|---|
| Company: Regions / Portfolio Groups | `companies.regions` / `community_groups` counts |
| Company: PMS Provider | `companies.data_providers` (string array; empty ⇒ "Not configured") |
| Property: Status | lifecycle **dates** — `released_date` → `submitted_final_approval_date` → `production_started_date` → `date_activated`, else `installed` |
| Property: products | `touchscreen_app`, `self_tour`, `product_options` / `enable_sdk_map` |
| Property: lock / identity / PMS dots | `enable_locks` + provider; `tours.visual_id_verification`; `data_provider` + `credential` |
| Property: Tour Published | the community's tour has ≥ 1 `tour_stop` |

Three design columns have **no** counterpart and were left out rather than faked: a company
contact person, a per-property region column, and the `prodEnabled` product toggles.

## 7. How to run it locally

```bash
# 1. Rails (port 3000) — note the RVM path
cd /Users/zubairzulifqar/pynwheel-staging
export PATH="$HOME/.rvm/rubies/ruby-3.3.5/bin:$PATH"
bundle exec rails s -p 3000 -b 127.0.0.1

# 2. Next (port 3001)
cd pyn-connect-web
npm install          # if node_modules is missing
npm run dev
```

- Database: `pynwheel_development` (local Postgres, 217 companies / 803 communities).
- Sign-in account: `salahudin@pynwheel.com` (Super admin). **Ask the user for the password** —
  it was given in chat and is deliberately not written down here.
- `pyn-connect-web/.env.local` points at `http://127.0.0.1:3000`.
- Deployment (Docker, standalone, env vars, troubleshooting): `pyn-connect-web/DEPLOYMENT.md`.

**Servers as of this writing:** Rails running on :3000; `next dev` stopped; a standalone production
build was left running on :3002. Check with `pgrep -fl puma` / `pgrep -fl "node server.js"`.

## 8. Extracting more from the design file

```python
import re, json, base64, gzip
src = open('pyn-connect-new.html', encoding='utf-8', errors='replace').read()
grab = lambda k: re.search(r'<script type="__bundler/%s"[^>]*>(.*?)</script>' % k, src, re.S).group(1)
template = json.loads(grab('template'))     # the markup, ~738 KB
manifest  = json.loads(grab('manifest'))    # uuid -> {mime, compressed, data(base64)}
```

Markup uses `sc-if` / `sc-for` with `{{ }}` bindings; the screen state and seed data live in the
`<script type="text/x-dc">` block at the end. Screens are keyed by `isOrgs` (Companies),
`isProperties`, `isAuth` (Sign In). Compressed manifest entries need `gzip.decompress`.

## 9. Git state

- **Remote:** `git@github-work:ZubairZ2/pynwheel-connect-remap.git` (the user's work SSH alias).
- **Branch:** `feat/pyn-connect-initial-screens`, pushed, PR #1 open against `main`.
- **Commits** (history was rewritten once to strip AI co-author trailers — do not resurrect them):

| Hash | Subject |
|---|---|
| `d3d409862` | Add JSON listings for Pynwheel Connect companies and properties |
| `b519a5ce3` | Add Pynwheel Connect web app: Sign In, Companies, Properties |
| `6874e27bc` | Document the React/Next infrastructure and the Connect implementation log |
| `7c9edb01c` | Make Pynwheel Connect web deployable to another host or production |

**Standing rule from the user: never add `Co-Authored-By: Claude …`, "Generated with Claude Code",
or any AI attribution to a commit message or PR description.** This overrides Claude Code's default
attribution guidance.

**Deliberately untracked**, do not commit without asking: `pyn-connect-new.html` (20 MB),
`feature1.md`, `latest.dump` / `pynwheel-staging.dump` (6.4 GB), and the user's pre-existing local
edits to `bin/*`, `config/database.yml`, `db/schema.rb`, `.DS_Store` files.

## 10. Verified

Against the live Rails app and the real database:

| Check | Result |
|---|---|
| Sign in with a valid account | 200, real user in the sidebar |
| Wrong password | 401, "Invalid Email or password." (Rails' own flash) |
| Account without `pynwheel_connect_access` | 401, "Sorry! you don't have access for Pynwheel Connect…" |
| Companies | 217 real companies |
| Properties | 802 real communities, with status pills, product tags, integration dots |
| Unauthenticated / stale cookie / after sign-out | 307 → `/sign-in` |
| Role scoping | super admin 802, company admin 1, community admin 0 |
| Legacy `/`, `/companies`, `/companies/:id/communities` HTML | still 200 |
| Production standalone build (`node server.js`) | health 200, sign-in, both listings, assets |
| `npm run build` / `tsc --noEmit` | clean |

## 11. If the work continues

Nothing is outstanding from the brief. Likely next asks, with where they belong:

- **More screens** (Company detail, Property detail, Dashboard) — the design has all of them; add a
  screen + hook + generator, and a JSON branch on the matching legacy controller.
- **Pagination** — 802 rows render fine but the payload is large. Belongs in a presenter on the
  Rails side (`react-architecture.md` §14), not in the frontend.
- **Row actions / CRUD** — out of scope for phase 1 and explicitly excluded by the brief.
- **Tests** — none were written; the brief asked for end-to-end verification, which was done
  manually against real data. Vitest + Playwright would follow `pyn-system/apps/pyn-cms`'s setup.

Whatever is added, keep `react-architecture.md` §20 current with a dated entry — the brief requires
it, in the *What was missing / What was found / Reference* format.

---

## 12. Phase 2 — the full design port

### What shipped

| Area | Screens |
|---|---|
| Overview | Dashboard |
| Accounts | Company detail, Regions, Portfolio Groups; Property detail, Pricing & Availability, Units & Floor Plans, Unit detail, Map & Plotting, Property Inventory, Tour Setup, Design System & Branding, Property Content |
| Leasing | Tour Scheduling, Pricing Calculator, Favorites & eBrochure |
| Residents | Resident Access |
| Platform | Integrations Hub, SVG Maps Optimizer, Partner Configuration, White-Label Builds, Live Chat, AI Services |
| Insights | Analytics, Reports |
| Administration | Users & Roles, Billing, Audit Log, Help & Tutorials |

Plus nine dialogs (the shared add/edit form, Floorplate, Floor Plan, Pricing Fee, Mass Override,
Design Kickoff, Logo Crop, Lock Instructions, Flagged Transcript), the confirm dialog and the toast.

### Deliberately not built

- **Sign Up.** The design has it; the brief forbids a new authentication system (§14) and new
  backend endpoints (§6), and account creation needs both.
- **The design's mock Companies / Properties listings.** Those two screens already exist at
  `/companies` and `/properties` against the real database, and the brief says to leave them alone.

### How the demo data is wired

```
src/data/mock/*.mock.ts → core/models/data/connect → core/store/demo (one Redux slice)
   → core/utils/generator/connect (pure) → core/hooks/connect → core/screens/connect
```

Replacing a screen's demo data with a real endpoint means adding a thunk that writes parsed models
into the same slice. Nothing above the slice changes.

### Things that cost time (read before touching this)

1. **`pyn-connect-new.html`'s markup is a template dialect, not HTML** — `sc-if`, `sc-for`,
   `{{ }}`, `sc-camel-on-click`, `<dc-import>`. It was translated mechanically rather than retyped;
   see `react-architecture.md` §20, "porting the design's markup".
2. **Seed data must be deterministic.** A `Math.random()` in one seed constant caused a hydration
   mismatch on Integrations: module constants are evaluated once on the server and again in the
   browser.
3. **A dialog's outer conditional is its open/closed guard.** Strip it (as you would for a screen,
   whose guard is the route) and every dialog renders open at once.
4. **Text either side of an inline `<b>` needs its whitespace preserved**, or words run together.
5. **Restart `next dev` after deleting `.next`,** or pages render with no stylesheet and you will
   think the CSS is broken.
6. **Screens are behind the Devise session guard**, which the test runner has no credentials for.
   `app/screen-harness/[screen]` renders one screen with the demo store for the end-to-end suite;
   it 404s in production unless `PYN_CONNECT_SCREEN_HARNESS=on`.

### Switching back to the legacy ERB flow

`pyn-connect-web/src/config/app/reactFlow.ts` — uncomment the `// return false;` at the top, or set
`PYN_CONNECT_REACT_FLOW=off`. Every Connect route then redirects to the Rails app. Rails is
untouched either way; its HTML routes have never stopped working.

### Running the tests

```bash
cd pyn-connect-web
npm run test:e2e        # 80 Playwright tests, real Chrome
npm run typecheck
npm run build
```
