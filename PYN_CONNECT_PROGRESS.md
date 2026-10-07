# Pynwheel Connect: progress and handoff

**Last updated:** September 24, 2026
**Read this first in a new session.** For what the repository itself is (Rails stack, models, roles, integrations), see [context.md](context.md).

This is the single progress document. It merges the original phase 1/2 handoff with the Sep 23 summary (formerly `progress.md`, now removed), and it is current through **phase 2d** (§15, revised in §16).

- Phases 1 to 2c are merged to `main` (PR #3 was the last).
- Phase 2d, the real-data Property Detail page, is on branch `feature/properties_detail_page`. Its backend gaps are in [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md).
  - First version: commit `ef9e4549a` (local, not pushed).
  - Revision under the relaxed backend rule (§16): in the working tree / staged.

---

## 1. Status at a glance

| Phase | Brief | Where | State |
|---|---|---|---|
| **1**: Sign In, Companies, Properties on real data | [feature1.md](feature1.md) | `feat/pyn-connect-initial-screens` → `main`, **PR #1** (merged) | ✅ Done |
| **1b**: Pagination, 10 per page, server-side | chat request, Sep 17 | `feat/pyn-connect-initial-screens` (`dec760dda`) | ✅ Done |
| **2**: Full `pyn-connect-new.html` UI on demo data | [feature-whole-ui-next.md](feature-whole-ui-next.md) | `feat/pyn-connect-full-ui` → `main`, **PR #2** (merged) | ✅ Done |
| **2b**: Merge 1b into 2 | — | `feat/pyn-connect-full-ui` (`4ec2242aa`) | ✅ Done. ⚠️ One doc section was lost (see §10) |
| **Staging deploy** on Heroku (Rails and Connect) | chat, Sep 23 | apps `pyn-system` and `pyn-system-connect` | ✅ Live |
| **2c**: Companies and Properties listings → the 22-Sep design | chat, Sep 24 | `feature/Companies_and_properties_improvments` → `main`, **PR #3** (merged) | ✅ Done, 4 items deferred (§14) |
| **2d**: Property Detail on real data, no backend changes | `properties_detail_feature.md`, Sep 24 | `feature/properties_detail_page` (`ef9e4549a`, local, no PR yet) | ✅ Done for what the listing exposed (§15) |
| **2d-r**: Property Detail, revised rule (read-only JSON on `communities#edit`) | `properties_detail_feature.md` §9a, Sep 24 | `feature/properties_detail_page` (not yet committed) | ✅ Every design section on real data except R1–R4 in [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md) §0 (§16) |
| **2e**: Property Inventory on real data (read-only JSON on the four inventory `index` actions) | `feature_inventory_page.md`, Sep 24 | `feature/inventory_implementation` (on `824c1f07a`, uncommitted) | ✅ All four tabs, filters, viewer and dialogs on real data; gaps G15–G21 (§17) |
| **2k**: Inventory loads units on demand; Companies / Properties column sorting; Map & Plotting review | `improvments_relatd_to_ploting_listing_inventory.md`, Sep 30 | `feature/plotting_sorting_inventory_perf` (from `main` `b04012b4a`) | ✅ (§24) |
| **2l**: Map & Plotting — Manual Plot states, zoom / reset, legacy markers and paths, SVG labels | `ploting_map_improvments.md`, Oct 1 | `feature/map_zoom_labels_pins` (from `feature/plotting_sorting_inventory_perf` `5ab58783d`) | ✅ incl. John Demo floors 1 and 3 on the user's data (§25) |
| **2m**: Map & Plotting — Wayfinding mode, Plot on Map, Additional Stops | `Feature_wayfinding.md`, Oct 1 | `feature/wayfinding_plot_on_map` → `main`, **PR #16** (merged Oct 2) | ✅ (§26) |
| **2n**: Map & Plotting — Detect Hallways, the POC's editing, A* routing | `POC_auto_plot_impmemnted.md`, Oct 1 | `feature/wayfinding_detect_hallways_auto_connect` → `main`, **PR #15** (merged Oct 2) | ✅ (§27) |
| **2o**: Map & Plotting — stored hallways kept by Detect, Auto-Connect folded in, editable bridges, hollow markers; favicon, top-bar profile | `POC_auto_plot_impmemnted_issues.md`, Oct 2 | `improvement/wayfinding_hallway_persistence_markers` → `main`, **PR #17** (merged Oct 2) | ✅ (§28); final pre-production run on `main` at the end of §28 |
| **3**: Replace demo data with real Rails data | *brief not written yet* | — | ⏭ Next (§11) |

**`main` holds everything above** (PRs #1–#17 merged; phases 2f–2j are §18–§23, merged through PRs #5–#12). As of October 2, 2026, local `main` (`1357822ec`) equals `origin/main`, and its tree is identical to the phase 2o commit `8ee78da06`. Every feature branch listed in `git branch --merged` is in.

---

## 2. What this is

**Pynwheel Connect** is the new back office: a Next.js app in [pyn-connect-web/](pyn-connect-web/) that reads the **existing Pynwheel CMS (Rails) in this repo**.

- It has no second backend.
- It adds no new authentication system.
- Real data comes from `format.json` branches on the existing controllers.

| Screens | Data |
|---|---|
| Sign In, Companies, Properties | **Real**: Devise and the local/staging Postgres |
| Property Detail for a real (numeric) id, *2d* | **Real**, but only the fields the Properties listing row carries (§15) |
| The other 29 screens and 9 dialogs, including the demo Property detail for slug ids (`/properties/luxe`) | **Demo**: `pyn-connect-web/src/data/mock/*.mock.ts` |

### Input files

| File | What it is | How to read it |
|---|---|---|
| `feature1.md`, `feature-whole-ui-next.md`, `properties_detail_feature.md` | The phase 1, 2 and 2d briefs | Plain markdown |
| [react-architecture.md](react-architecture.md) | The architecture to follow **and keep updated** | §1–19 describe the **ezofficeinventory** React SPA (`/Users/zubairzulifqar/ezofficeinventory`, a different product). §20 is the dated log of how that maps onto Connect |
| `pyn-connect-new.html` | The design, 20 MB | **Not plain HTML.** It is a bundled page; see §13 for how to extract it. **Never paste it into a chat**, because it overflows the context |
| `pyn-connect-22-sep-new.html` | The 22-Sep revision of the design, 21 MB. **Now the target** for Companies and Properties (§14) and Property Detail (§15) | Same bundle format as above (§13) |

`/Users/zubairzulifqar/pyn-system` is a separate future monorepo. **This work does not go there.**

---

## 3. Decisions already made (do not re-litigate)

1. The app lives in this repo at `pyn-connect-web/`, not in `pyn-system`.
2. Sign In goes through a Next.js server-side proxy that holds the Devise session cookie as httpOnly. There is no CORS surface and no new auth backend.
3. Data comes from **`format.json` on the existing controllers**. There is no new API namespace.
4. Serializers are POROs in `app/serializers/connect/`, because the repo has no AMS. Stack decision: **keep Jbuilder**; do not migrate serializers.
5. **Properties scope** is every community the signed-in user may see. For a super admin that is all of them (803), matching the legacy Home screen. It is *not* the `current_company` scope of `CommunitiesController#index`'s HTML path.
6. **Pagination** runs in SQL (will_paginate, as `SvgOptimizerController` already does). Listing state lives in the URL.
7. **Redux** was added only once there was cross-tree state (phase 2's dialogs). It is one demo slice.
8. **Stack** (Sep 11): Next.js, Jbuilder, Bugsnag. Hosting is Heroku first, later Vercel for the frontend and AWS for the backend.
9. **Hosting shape:** **two Heroku apps**, `pyn-system` (Rails) and `pyn-system-connect` (Next.js), because a Heroku app routes only one web process.
10. **Staging DB:** restore production data **without the `versions` rows**. Keep the table; the gem stays (see §9).
11. **No AI attribution in any commit or PR.** No `Co-Authored-By: Claude` line, no "Generated with Claude Code". History was rewritten once to strip it; do not bring it back.

---

## 4. What was built

### Rails side

| File | Purpose |
|---|---|
| `app/controllers/companies_controller.rb` | `render_connect_companies if request.format.json?`. The HTML path is untouched |
| `app/controllers/communities_controller.rb` | `return render_connect_properties if request.format.json? && params[:enable_communities].blank?` |
| `app/queries/accessible_communities_query.rb` | The "which communities may this user see" rules, extracted from `HomeController#index`. Phase 1b added search, filters and SQL paging |
| `app/queries/accessible_companies_query.rb` | *1b.* Mirrors the role branches of `CompaniesController#index` as an ordered relation |
| `app/serializers/connect/response_envelope.rb` | `{ data, meta, flash_messages }`, with `meta.current_user` on every listing |
| `app/serializers/connect/paginated_collection.rb` | *1b.* One page plus `{ page, per_page, total_count, total_pages }`. A page past the end clamps to the last page |
| `app/serializers/connect/{company,property}_serializer.rb` | Row shapes. The four company association counts use one grouped query each |
| *2c* listing meta | `companies.json`: `scope_total_count`, `property_total_count`. `communities.json`: `scope_total_count`, `filters.data_providers`. Filters take comma-separated lists; `data_provider` is new (§14) |
| `vendor/assets/javascripts/jsTimezoneDetect.js` | *Heroku.* Vendored in place of the `rails-assets-jsTimezoneDetect` gem, so the build does not depend on rails-assets.org (`d5280f9ff`) |

- **Endpoints:** `GET /companies.json` and `GET /communities.json`. Both need a Devise session.
- **Constraints kept:** no schema change, migration, route change or auth change.
- **Phase 2d added nothing on the Rails side.** Property Detail reads the `communities.json` rows (§15).
- **Revision 2d-r (§16):** `communities_controller.rb` `#edit` gained a JSON branch (`render_connect_property_detail`), served by the new `app/serializers/connect/property_detail_serializer.rb`. Endpoint: `GET /communities/:id/edit.json`. The HTML path, queries, models and schema are unchanged.

### Next.js side, `pyn-connect-web/`

Stack: Next 15 App Router, React 19, TypeScript, plain CSS with the design's tokens. It runs on **:3001** locally and on `$PORT` on Heroku.

**Layering** follows react-architecture.md, adapted to the App Router:

```
route (server component) → API module → parser → model → screen → hook → generator → template → component
```

| Area | Where |
|---|---|
| Rails URLs (`CORE_URLS`, `baseURLGenerator`) | `src/config/app/urls.ts` |
| The **only** `fetch` (replays the httpOnly Rails cookie) | `src/core/repository/remote/api/base.api.ts`, plus `auth`, `companies`, `properties` |
| Envelope unwrap, snake_case → camelCase | `src/core/repository/parser/`. **Nowhere else** |
| Pure descriptor builders (columns, rows, pills, filters, pager) | `src/core/utils/generator/` |
| Auth route handlers and health check | `src/app/api/auth/{sign-in,sign-out}/route.ts`, `src/app/api/health/route.ts` |
| Pagination UI | `core/components/organisms/Pagination.tsx`; `useListingParams`, `useDebouncedSearch`; `loading.tsx` for each listing route |
| *2c* multi-select filter | `core/components/molecules/MultiFilter.tsx` (the design's `MultiFilter.dc.html`) |
| *Phase 2* route registry | `src/config/app/connectRoutes.ts` |
| *Phase 2* React ↔ legacy ERB switch | `src/config/app/reactFlow.ts` |
| *Phase 2* screen harness for e2e | `src/app/screen-harness/[screen]`. 404s unless `PYN_CONNECT_SCREEN_HARNESS=on` |
| *2d* one property by id | ~~`propertyLookup.server.ts`, walking `communities.json`~~. Removed in 2d-r: `fetchPropertyDetail` → `GET /communities/:id/edit.json`, parsed by `parsePropertyDetail` (§16) |
| *2d* Property Detail, real data | `app/(connect)/properties/[propId]/page.tsx` (numeric id → real, slug → demo), `core/screens/properties/propertyDetail.screen.tsx`, `core/hooks/usePropertyDetail.ts`, `core/utils/generator/propertyDetail.generator.ts` |
| *2d* detail building blocks | `core/components/molecules/DetailSection.tsx`, `core/components/atoms/Switch.tsx` (read-only); `RowDescriptor.href` makes `CustomTable` rows open their record |
| *2d* hand-off links to the legacy CMS | `legacyCmsURLs` in `src/config/app/urls.ts` (built on `NEXT_PUBLIC_CMS_URL`) |

**Rules:**
- Only route handlers and server components touch the network.
- Components never fetch.
- Generators hold no state.
- Parsers are the only place a snake_case key exists.

### Phase 2 screens (demo data)

| Group | Screens |
|---|---|
| Overview | Dashboard |
| Accounts | Company detail, Regions, Portfolio Groups; Property detail (slug ids only since 2d; real ids use the §15 screen), Pricing & Availability, Units & Floor Plans, Unit detail, Map & Plotting, Property Inventory, Tour Setup, Design System & Branding, Property Content |
| Leasing | Tour Scheduling, Pricing Calculator, Favorites & eBrochure |
| Residents | Resident Access |
| Platform | Integrations Hub, SVG Maps Optimizer, Partner Configuration, White-Label Builds, Live Chat, AI Services |
| Insights | Analytics, Reports |
| Administration | Users & Roles, Billing, Audit Log, Help & Tutorials |

**Dialogs:**
- Shared add/edit form
- Floorplate
- Floor Plan
- Pricing Fee
- Mass Override
- Design Kickoff
- Logo Crop
- Lock Instructions
- Flagged Transcript
- Confirm dialog, and a toast

**Deliberately not built:**
- **Sign Up.** It needs new auth and new endpoints, which the brief forbids.
- **The design's mock Companies/Properties.** The real screens stay in their place.

**How the demo data is wired:**

```
src/data/mock/*.mock.ts → core/models/data/connect → core/store/demo (one Redux slice)
   → core/utils/generator/connect (pure) → core/hooks/connect → core/screens/connect
```

`audit.generator.ts` and `admin.generator.ts` (`AI_REVIEW_QUEUE`) hold hardcoded seeds with no mock file.

### Switching back to the legacy ERB flow

- **How:** in `pyn-connect-web/src/config/app/reactFlow.ts`, uncomment `// return false;`, or set `PYN_CONNECT_REACT_FLOW=off`. Every Connect route then redirects to Rails.
- **Why the switch lives in Next.js:** the brief pointed at `react_supported_controller_action?`. That method is ezofficeinventory's; it **does not exist in this repo**, and Connect is a separate origin, not views rendered by Rails. So the switch sits in Next.js with the same early-return shape. This is documented in react-architecture.md §20.

---

## 5. Design → database mapping (real-data screens)

| Design field | Source |
|---|---|
| Company: Regions / Portfolio Groups | Counts of `companies.regions` / `community_groups` |
| Company: PMS Provider | `companies.data_providers` (a string array; empty ⇒ "Not configured") |
| Property: Status | Lifecycle **dates**, in order: `released_date` → `submitted_final_approval_date` → `production_started_date` → `date_activated`, else `installed` |
| Property: products | `touchscreen_app`, `self_tour`, `product_options` / `enable_sdk_map` |
| Property: lock / identity / PMS dots | `enable_locks` + provider; `tours.visual_id_verification`; `data_provider` + `credential` |
| Property: Tour Published | The community's tour has at least one `tour_stop` |

| *2d* Property Detail: header, Profile (Name, City · State, Units), Products, Inventory (Units), lifecycle | The same listing row. Every other Property Detail field is mapped to its column in [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md) |

Three design columns have **no** counterpart and were left out rather than faked:
- a company contact person
- a per-property region column
- the `prodEnabled` product toggles

The full rationale is in react-architecture.md §20.

---

## 6. Traps that already cost time

**Rails and auth**

1. **A failed Devise sign-in answers 200, not 302.** The error is in `flash.now` in *that* response body; a follow-up GET shows nothing.
2. **A successful sign-in POST does not prove a session exists.** `Users::SessionsController#create` signs the user back out when `pynwheel_connect_access` is false, and still redirects. Verify with an authenticated JSON call.
3. **`Accept: application/json` is load-bearing.** Otherwise Devise answers `*/*` with a 302 to login instead of a 401, and the list renders empty with no error.
4. **`communities.product_options` is jsonb holding a JSON *string*.** Parse it twice.
5. **When paging, use preload, not includes or a join.** A JOIN applies LIMIT/OFFSET to the joined rows and returns the wrong page.
6. **Session cookies are `Secure` in production.** Over plain HTTP, set `PYN_CONNECT_COOKIE_SECURE=false`.
7. **Use the RVM ruby** (`~/.rvm/rubies/ruby-3.3.5/bin`). rbenv's 3.3.5 fails with `linked to incompatible libruby`.
8. **The committed `db/schema.rb` is stale** (2025_04_26); the migrations reach 2026_09_01. `calculator_configs`, `design_system_configs`, `svg_optimization_runs`, `font_settings`, `map_filters`, `sdk_sessions` and `unit_space_details` exist only in the migrations. Trust the migrations.

**Next.js**

9. **`next build` and `next dev` fight over `.next`.** Stop dev, `rm -rf .next`, rebuild, **then restart dev**. Otherwise pages render with no stylesheet.
10. **Seed data must be deterministic.** A `Math.random()` in a seed caused a hydration mismatch.

**Porting the design markup**

11. **It is a template dialect** (`sc-if`, `sc-for`, `{{ }}`, `sc-camel-on-click`, `<dc-import>`). Translate it mechanically; don't retype it.
12. **A dialog's outer `sc-if` is its open guard.** Strip it and every dialog renders open at once.
13. **Preserve the whitespace either side of an inline `<b>`,** or words run together.

**Heroku**

14. **rails-assets.org is not reliable on a build server.** jstz is now vendored (§4).
15. **Next.js must bind `$PORT`.** `"start": "next start -p ${PORT:-3001}"` and `"engines": { "node": "22.x" }` (`605c9116c`).
16. **Two traps for `pg:backups:restore`:**
    - It cannot filter out `versions`, so restore from the laptop with `pg_restore -L … --no-owner --no-acl`.
    - The restore must finish **before** the first `db:migrate`.

**Phase 2c (local verification)**

17. **Port 3000 may belong to another app.** On Sep 24 an `ezofficeinventory` Puma took :3000 mid-session and this repo's Rails was killed. Run Rails on another port (e.g. `-p 3100`) and start Connect with `PYNWHEEL_CMS_URL=http://127.0.0.1:3100 npm run dev`. The environment variable overrides `.env.local`.
18. **`fonts.gstatic.com` resets connections from this machine**, so the e2e "no console errors" checks fail on the font request, not the app (§14).
19. **In Ruby, `[false].any?` is `false`.** Check `empty?` before adding a clause built from booleans.

**Phase 2d (Property Detail)**

20. **Rails had no single-property JSON and no id filter** (2d). The first version walked the listing: 9 requests for a super admin, 2–3 s in dev. *Superseded by §16:* `communities#edit.json` answers in one request.
21. **The demo `STAGES` mock puts Final Approval *after* Released.** The real order (the serializer's ranking) is installed → activated → production → approval → released. Do not reuse the mock for real data.
22. **A Google Fonts stall can make one browser navigation take ~30 s** (trap 18, intermittent). Before blaming the app, read the time in the Next log (`GET /properties/364 200 in 159ms`) or `curl` the page.
23. **`globals.css` has no margin reset, and `a` is accent-blue.** New classes must zero their own `h2`/`h3`/`p`/`dl`/`dd`/`ul` margins. A link meant to look like text needs its own `color`.
24. **`loading.tsx` wraps nested routes.** `properties/[propId]/loading.tsx` ("Loading property…") also shows while the demo sub-screens (`/properties/:id/map`, …) load.
25. **The property's own tour is `Community#community_tour`** (the last tour with `tour_user_id: nil`). `has_one :tour` can return a visitor's customised copy. For 1411 that is 4 stops instead of the real 5. The listing's `tour_published` still uses `community.tour`.
26. **Devise sessions time out after 8 hours** (`timeoutable`), so a minted session goes 401 overnight. Re-mint it.
27. **If `config/database.yml` has been reset to the committed version** (`username: postgres`, a role this machine lacks), `rails runner` fails to connect. Prefix it with `DATABASE_URL=postgres://$(whoami)@localhost/pynwheel_development` rather than editing the file. Also prefix `DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES` if it crashes on fork.
28. **The dev server's evented file watcher can lag** a second or two after a Ruby edit. Re-request before assuming a change did not load.

---

## 7. Running locally

```bash
# Rails :3000 (use the RVM ruby)
cd /Users/zubairzulifqar/pynwheel-staging
export PATH="$HOME/.rvm/rubies/ruby-3.3.5/bin:$PATH"
bundle exec rails s -p 3000 -b 127.0.0.1

# Connect :3001
cd pyn-connect-web
npm install          # if node_modules is missing
npm run dev
```

| Check | Command |
|---|---|
| Types | `npm run typecheck`. ✅ Clean on `feature/properties_detail_page` (Sep 24) |
| Build | `npm run build` |
| End-to-end | `npm run test:e2e` (80 Playwright tests, real Chrome; start dev with `PYN_CONNECT_SCREEN_HARNESS=on`). Sep 24, also re-run on 2d: 51 pass; the other 29 fail only on the unreachable Google Fonts request (trap 18) |

- **Database:** `pynwheel_development` on local Postgres (217 companies, 803 communities).
- **Sign-in account:** `salahudin@pynwheel.com` (Super admin). **Ask the user for the password**; it is deliberately not written down.
- **Testing without the password:** mint a Devise session with `rails runner`, then give Connect its two cookies. Used for 2c and 2d; the script is below.
- **Other test users:** `jleinweber@zaremba.net` (Company admin, company 129) is handy for scope checks. Only property 364 is visible to them; 365–368 are locked.

```ruby
# EMAIL=someone@pynwheel.com bundle exec rails runner mint_session.rb   (local dev only)
user = User.find_by!(email: ENV.fetch('EMAIL'))
key  = Rails.application.config.session_options[:key] || '_pynwheel-cms_session'
env  = Rack::MockRequest.env_for('http://127.0.0.1:3000/').merge(Rails.application.env_config)
jar  = ActionDispatch::Request.new(env).cookie_jar
jar.encrypted[key] = { value: {
  'session_id' => SecureRandom.hex(16),
  'warden.user.user.key' => [[user.id], user.authenticatable_salt],
  'warden.user.user.session' => { 'last_request_at' => Time.now.to_i },
  '_csrf_token' => SecureRandom.base64(32) } }
puts JSON.generate(rails_cookie: "#{key}=#{Rack::Utils.escape(jar[key])}",
                   user: Connect::ResponseEnvelope.current_user_meta(user))
```

In the browser (Playwright `context.addCookies`, on the Connect origin, httpOnly), set:
- `pyn_connect_rails_session` = `encodeURIComponent(rails_cookie)`
- `pyn_connect_user` = `encodeURIComponent(JSON.stringify(user))`
- `pyn-connect-web/.env.local` points at `http://127.0.0.1:3000`.
- Docker and standalone deployment: [pyn-connect-web/DEPLOYMENT.md](pyn-connect-web/DEPLOYMENT.md).

---

## 8. Staging deploy on Heroku (live since Sep 23)

| | Rails CMS | Pynwheel Connect |
|---|---|---|
| **App** | `pyn-system` | `pyn-system-connect` |
| **URL** | https://pyn-system-16a05cad79df.herokuapp.com | https://pyn-system-connect-de8364f794a0.herokuapp.com |
| **Owner** | team `pynwheel@herokumanager.com` | same |
| **Stack** | heroku-24 | heroku-24 |
| **Buildpacks** | `heroku/ruby` | `lstoll/heroku-buildpack-monorepo` (`APP_BASE=pyn-connect-web`), then `heroku/nodejs` |
| **Add-ons** | Postgres **essential-1** (10 GB), Redis **mini** | none |
| **Dynos** | `web=1` (Basic). **`worker` not scaled, on purpose** | `web=1` (Basic) |
| **Deployed commit** | `d5280f9ff` (release v7) | `605c9116c` (release v5) |

**Config var names** (values live in Heroku, never here):

- **Rails:**
  - Rails runtime: `RAILS_ENV`, `RACK_ENV`, `RAILS_SERVE_STATIC_FILES`, `RAILS_LOG_TO_STDOUT`, `SECRET_KEY_BASE`, `SECRET_KEY_BASE_v2`, `HOST_URL`
  - AWS: `AWS_*`, `S3_BUCKET_NAME`
  - Third-party services: `GOOGLE_MAPS_API_KEY`, `PUSHER_*`, `SMTP_*`, `BUGSNAG_API_KEY`, `STRIPE_*`, `TWILIO_*`
  - Set by the add-ons: `DATABASE_URL`, `REDIS_URL`
- **Connect:** `APP_BASE`, `PYNWHEEL_CMS_URL`, `NEXT_PUBLIC_CMS_URL`, `NEXT_PUBLIC_ENV_LABEL`

**Deploying:**

```bash
git push heroku         feat/pyn-connect-full-ui:main   # Rails  (remote → pyn-system)
git push heroku-connect feat/pyn-connect-full-ui:main   # Connect (remote → pyn-system-connect)
heroku run rails db:migrate -a pyn-system               # only when migrations are added
```

`NEXT_PUBLIC_*` values are baked in at build time. After changing one, redeploy Connect.

**Verified Sep 24:**

| Check | Result |
|---|---|
| Rails `/users/sign_in` | 200 |
| Connect `/sign-in` | 200 |
| Connect `/api/health` | `{"ok":true,"cms":{"reachable":true,"detail":"HTTP 200"}}` |
| DB size | 1.51 GB / 10 GB |
| DB contents | 217 companies, 803 communities, 134 tables; migrations current at `20260901000000` |
| `versions` | Table present. **4 rows**: new audit writes since the restore, which is expected |

---

## 9. The `versions` table (PaperTrail): findings and decision

- **What it is:** an audit log written by `has_paper_trail` in **24 models**. On production data it is about **9.2 GB** on disk and 49–55 GB as dump SQL.
- **Why it is so big:** 18,105 `User` versions hold about 49 GB. `User` mounts `AvatarUploader` (CarrierWave), and PaperTrail serializes the whole uploader object graph into every snapshot.
- **What reads it:** nothing. Every read of `PaperTrail::Version` is commented out, as is the logs screen and its route.
- **What still writes to it** (so **do not drop the table or remove the gem** without a code change):
  - `before_action :set_paper_trail_whodunnit` and `info_for_paper_trail` in `ApplicationController`
  - a live `PaperTrail::Version.create` in `floorplates_controller.rb:128`
  - about 40 `PaperTrail.enabled` toggles in the Yardi, RentCafe, RealPage and Zaremba services and `CloneCommunityJob`
  - every sign-in, because Devise saves `User`
- **Staging:** restored without the rows. The table stays and the app works.
- **Upstream fix, not yet done** (a separate decision for production): `has_paper_trail skip: [:avatar]` on `User`. Use **`skip`, not `ignore`**; `ignore` still stores the column in the snapshot. Removing PaperTrail completely is also possible, but it would also remove the option of an Audit Log in phase 3.

---

## 10. Open items and risks

1. ⚠️ **Staging holds production data and real integration credentials.** This includes the `credentials` table and the RealPage/Yardi keys hardcoded in `config/initializers/credentials_constants.rb`.
   - Keep **`worker=0`** and add no scheduler until a post-restore scrub has run. Otherwise Sidekiq jobs and rake tasks will sync against real PMS/CRM systems and email or text real people.
   - The SMTP and Twilio vars are set on `pyn-system`, so even web-triggered mail can go out.
2. ⚠️ **The pagination entry in react-architecture.md §20 was lost in the merge** (`4ec2242aa`). The section *"September 17, 2026 — Infrastructure Update: pagination"* exists in `dec760dda` but not on `feat/pyn-connect-full-ui`. Restore it from `git show dec760dda:react-architecture.md`.
3. **Re-run `npm run test:e2e` on a network that reaches Google Fonts.** Sep 24 gave 51 passes; the 29 failures were all the font request (§14). The suite does not cover the real listings or the real Property Detail, which need a Rails session. The 2d checks were run by hand with a minted session (§7, §15).
3a. **Phase 2c follow-ups:** see §14, "Remaining / follow-up".
3b. **Phase 2d follow-ups:** see §15, "Follow-ups", and [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md).
4. **Pull requests:** none open. PRs #1, #2 and #3 are all merged into `main`. Phase 2d is uncommitted on `feature/properties_detail_page`.
5. **`db/schema.rb` in git is stale** (see trap 8). The local copy has uncommitted edits.
6. **Leftover local files:** `toc.list` and `toc-trimmed.list` (the restore's table of contents). Delete them or keep them out of git.

---

## 11. Next implementation: phase 3, demo data → real data

Phase 2's data layer was built for this swap:

- Each screen reads parsed models from the demo Redux slice.
- To make a screen real, add a thunk that fetches from Rails, parses, and writes into the **same slice**.
- The screen, hook and generator code do not change.

The Rails side repeats the phase 1 recipe:

- a `format.json` guard on the existing controller
- a `Connect::*Serializer` PORO
- scoping through an `Accessible*Query`
- the `ResponseEnvelope`
- HTML paths left untouched

### Readiness of each demo screen

| Screen | Legacy counterpart | Readiness |
|---|---|---|
| Regions | `regions#index/show` (name, contact, phone, email) | **Ready**: fields match |
| Portfolio Groups | `community_groups#index/show` | **Ready**: video/master flags are derived |
| Units / Unit detail | `units#index/edit`, `floorplans`, `floorplates`; `UnitFilterQuery` exists | **Ready** |
| Inventory (read) | `amenities#index`, `floorplans`, `floorplates` | **Ready** |
| Branding | `design_system_configs#show/update` (already JSON), `design#index`, `font_settings` | **Ready** |
| Pricing Calculator | `calculator_configs#show/update/publish` (already JSON, jsonb) | **Ready** |
| Billing | `communities.billing_*` columns, `update_billing_rate` | **Ready** |
| SVG Maps Optimizer | `svg_optimization_runs`; `status/bulk_status` already JSON | **Ready** |
| Users & Roles | `users#index/edit`, `invitations` | **Ready**: role vocabulary differs from the design |
| Partner Configuration | `partner_configurations#*` (JSON on update/bulk) | Ready/Partial |
| Scheduling | `schedual_tours/index.json.jbuilder`; `tour_users`, `opening_hours` | Ready/Partial |
| Favorites & eBrochure | `favorite_settings`, `favorite_images`, `ebrochure_menu_buttons` | Ready/Partial |
| Property detail | *2d:* the real screen exists, on listing-row data only (§15). Next: a detail endpoint (`communities#show` JSON + `Connect::PropertyDetailSerializer`) for the fields in the gaps doc (G1–G13) | Partial: frontend ready |
| Company detail | `companies#edit`, `company_settings`; history would come from `versions` | Partial |
| Dashboard | `home#index` counts; stages from `move_to_production` / `statuses` | Partial |
| Tour Setup | `tours#index/settings/select_stops` | Partial |
| Content | `additional_pages`, `homepage_icons`, `neighborhoods` | Partial |
| Pricing & Availability | Only `communities.additional_fee` (a single string); no fee model | Partial |
| Map & Plotting | `floorplates`, `sitemaps#map`, `automate_plotting` | Partial: keep it read-only |
| Analytics / Reports | `analytics#index` helpers render HTML; `reports#*` render CSV | Partial: needs JSON aggregations |
| Audit Log | paper_trail `versions`, but only about 10 models are useful and the history is not on staging | Partial |
| Integrations | Spread over about 10 tables (credentials, crm_credentials, lock accounts, map_partners) | Partial |
| Resident Access | `pynwheel_access_users`, `resident_access_points`; grants go through vendor lock APIs | Partial |
| Live Chat | `chats`, `chatrooms` (jbuilder exists); no staff or assignment model | Partial |
| Help | `tutorials` (videos, not help sections) | Partial/None |
| White-Label Builds | None (`app_versions` is one global row) | **None** |
| AI Services | None | **None** |

`api/v2/*` (the onboarding portal API) already returns JSON, but it uses **token auth** (`ApiApplicationController#check_user_auth`), not the Devise session. Reusing it needs an auth bridge. That is the user's decision; do not assume it.

### Suggested order: read-only first, most value for least effort

1. **Regions and Portfolio Groups.** This finishes the Companies drill-down.
2. **Property detail.** The frontend is done (2d, §15). What remains is backend: a detail serializer for the gaps doc's fields (profile, settings, billing, inventory counts). It also feeds the Dashboard KPIs.
3. **Units, Unit detail and Inventory.** Paginate them the way phase 1b did.
4. **Branding, Pricing Calculator and SVG Maps Optimizer.** Their JSON endpoints already exist.
5. **Billing, then Users & Roles.**
6. **Scheduling (read-only), Favorites, Partner Configuration.**
7. **Defer:**
   - Analytics and Reports, which need new aggregations
   - Integrations and Resident Access, which depend on vendor APIs
   - Live Chat, which needs new models
   - White-Label Builds and AI Services, which have no backend

### Open questions for the phase 3 brief

- **Read-only, or real writes?** If writes, do they go through the existing `update` actions?
- **Mixed screens:** while screens switch over one at a time, show whether each one is real or demo?
- **`api/v2` token auth:** reuse it through a bridge, or stay with `format.json` on the HTML controllers? Phase 1 implies the latter.
- **Roles:** map the design's role names onto `User::ROLES`, or show the legacy names?

### Definition of done for each screen

- Real data comes through the existing controller with a JSON branch. The HTML path is unchanged.
- No schema change or migration without the user's explicit approval.
- A thunk feeds the demo slice; the screen, hook and generator code are unchanged.
- `typecheck`, `build` and `test:e2e` are green, and the harness still runs on the demo seeds.
- A dated entry is added to react-architecture.md §20 (*What was missing / What was found / Reference*).
- Verified against the local DB as super admin, company admin and community admin, then deployed to staging (§8).

---

## 12. Git state

- **Remote:** `git@github-work:ZubairZ2/pynwheel-connect-remap.git` (`github-work` is the user's work SSH alias).
- **Heroku remotes:** `heroku` → `pyn-system`, `heroku-connect` → `pyn-system-connect`.

| Hash | Branch | Subject |
|---|---|---|
| `d3d409862` | both | Add JSON listings for Pynwheel Connect companies and properties |
| `b519a5ce3` | both | Add Pynwheel Connect web app: Sign In, Companies, Properties |
| `6874e27bc` | both | Document the React/Next infrastructure and the Connect implementation log |
| `7c9edb01c` | both | Make Pynwheel Connect web deployable to another host or production |
| `dec760dda` | both | Paginate the Companies and Properties listings, 10 per page |
| `7653432f8` | full-ui | Port the full Pynwheel Connect UI to Next.js on demo data |
| `b194faec1` | full-ui | Track the Pynwheel Connect progress and handoff doc |
| `4ec2242aa` | full-ui | Merge branch 'feat/pyn-connect-initial-screens' into feat/pyn-connect-full-ui |
| `d5280f9ff` | full-ui | Vendor jstz so Heroku does not need rails-assets.org |
| `605c9116c` | full-ui | Bind Next.js to Heroku PORT and pin Node 22 |
| `3dc79eb86` | main | Merge pull request #1 from ZubairZ2/feat/pyn-connect-initial-screens |
| `6df3da6e7` | full-ui | progress file for the project (this doc and `context.md`) |
| `ea0c89072` | main | Merge pull request #2 from ZubairZ2/feat/pyn-connect-full-ui |
| `8aa39721f` | 2c | Bring the Companies and Properties listings in line with the 22-Sep design |
| `e75a4d90e` | main | Merge pull request #3 from ZubairZ2/feature/Companies_and_properties_improvments |
| `c9416ae67` | main | Bring the progress doc up to date with the merged PRs. Not on `origin/main`; it reached GitHub only as the tip of the (otherwise empty) pushed `origin/feature/properties_detail_page` |
| `ef9e4549a` | 2d | Add the Property Detail page on real listing data. **Local, not pushed** |

"Branch" is where the commit was made. "both" means the two phase 1/2 branches. All of these are on local `main` now.

**Phase 2d:** `feature/properties_detail_page` was cut from `c9416ae67`.
- Its first commit is `ef9e4549a` (§15).
- The §16 revision is staged on top of it and not yet committed.
- `feature/inventory_implementation` (the Inventory page) is a separate branch; its work is not part of these commits.

**Deliberately untracked; do not commit without asking:**

- `pyn-connect-new.html` (20 MB) and `pyn-connect-22-sep-new.html` (21 MB)
- `feature1.md`, `feature-whole-ui-next.md`, `properties_detail_feature.md` (the briefs). (`context.md` has been tracked since `6df3da6e7`. `gaps_properties_detail_feature.md` is a 2d deliverable and **should** be committed with it.)
- `latest.dump*`, `pynwheel-staging.dump` (~6 GB)
- the vendored bundle tree (`gems/`, `cache/`, `bundler/`, `extensions/`, `specifications/`, `build_info/`) and `bin/*` binstubs
- the local edits to `bin/rails|rake|spring`, `config/database.yml` and `db/schema.rb`
- `.DS_Store` and `toc*.list`
- `stash@{0}`, which only holds those local environment edits

---

## 13. Extracting more from the design file

```python
import re, json, base64, gzip
src = open('pyn-connect-new.html', encoding='utf-8', errors='replace').read()
grab = lambda k: re.search(r'<script type="__bundler/%s"[^>]*>(.*?)</script>' % k, src, re.S).group(1)
template = json.loads(grab('template'))     # the markup, ~738 KB
manifest  = json.loads(grab('manifest'))    # uuid -> {mime, compressed, data(base64)}; gzip.decompress if compressed
```

- The markup uses `sc-if` / `sc-for` with `{{ }}` bindings.
- Screen state and seed data are in the `<script type="text/x-dc">` block at the end.
- Screens are keyed by `isOrgs` (Companies), `isProperties`, `isPropertyDetail` and `isAuth` (Sign In).
- To pull one screen out of the template, start at `<sc-if value="{{ isPropertyDetail }}"` and count nested `<sc-if>` / `</sc-if>` until the depth returns to zero. Its computed values (`productCards`, `configCards`, `profile`, …) are in the `render` state of the `text/x-dc` block.
- `pyn-connect-22-sep-new.html` extracts the same way. Its manifest adds `MultiFilter.dc.html` and `ImageUploader.dc.html` (`ext_resources` maps the ids to file names). Rendering the file in Chrome (`file://…`, click Sign in, then the nav) is the quickest way to screenshot a reference.
- The four images for Sign In were extracted to `pyn-connect-web/public/images/`.

---

## 14. Phase 2c: Companies and Properties listings → the 22-Sep design

**Brief (chat, Sep 24):** bring the two real-data listings in line with `pyn-connect-22-sep-new.html`, using `pyn-connect-new.html` as the baseline to find what changed. Branch `feature/Companies_and_properties_improvments`: commit `8aa39721f`, merged to `main` as PR #3 (`e75a4d90e`).

### How the two design files differ

Both files extract the same way (§13). What differs, as far as these two screens are concerned:

- **Template:** only the `isOrgs` and `isProperties` blocks change, plus the sign-out button, which moves from the sidebar footer to the top bar. The `<style>` block, `NAV`, `TITLES` and the Add Company/Property dialogs are identical.
- **New sub-components:** `MultiFilter.dc.html` (a multi-select filter dropdown) and `ImageUploader.dc.html` (used by dialogs, not the listings). `StatusPill.dc.html` is byte-identical.
- **New images:** six floor plan/floorplate PNGs. None is used by the listings.
- **Seed/logic:** companies gain `status`/`statusV` (Active, Past Due, Onboarding). The property lifecycle grows from 5 stages to 7 (Order Received → Orientation). Filters become arrays. `visibleProps()` ANDs across filters and ORs within one.
- **No `@media` rules** in either file. The only responsive hint added is `flex-wrap:wrap` on the header and the Properties toolbar.

### Checklist

Legend: ✅ done and verified · ⚠️ deliberately deferred (see "Deviations").
Columns: **Old** = `pyn-connect-new.html`, **New** = `pyn-connect-22-sep-new.html`, **Before** = React before this phase.

#### A. Shared components

| # | Item | Old | New | Before | Change | Files | Status |
|---|---|---|---|---|---|---|---|
| A1 | Multi-select filter | Native `<select>`, one value | `MultiFilter`: button (all-label / one label / label + count badge, chevron), popover with checkbox rows, **Clear**, **Done**, "Showing everything" / "N selected" | `FilterSelect` (native select) | New molecule `MultiFilter` | `components/molecules/MultiFilter.tsx`, `globals.css` | ✅ |
| A2 | Listing page header | None | Row above the toolbar: total (800 20px) and a subtle summary line (600 12.5px), baseline-aligned, wraps | None | `summary` slot on `ResourceListingTemplate` | `templates/ResourceListingTemplate.tsx`, `globals.css` | ✅ |
| A3 | Sign-out button | 30×30 in the sidebar footer, next to the user | 38×38 (radius 8, 18px icon) in the top bar after the bell; the sidebar footer keeps only avatar, name and role | In the sidebar (30×30) | Moved to `Navbar` (applies to every screen) | `organisms/Navbar.tsx`, `organisms/Sidebar.tsx`, `atoms/Icons.tsx`, `globals.css` | ✅ |
| A4 | "N records" in the top bar | Not in the design (a phase 1 addition) | The totals live in the page header (A2) | `Navbar` showed `{n} records` | Removed; A2 replaces it | `ListingScreenTemplate.tsx`, `ConnectScreenTemplate.tsx`, `Navbar.tsx`, both `page.tsx`, strings | ✅ |
| A5 | Table cell types | — | Products-only tags; a row of link buttons | `integrations` cell (tags + lock/ID/PMS dots) | Added `tags` and `links` cells and an `actions` column kind; dropped `integrations` and its three dot icons | `organisms/CustomTable.tsx`, `generator/listing.types.ts`, `atoms/Icons.tsx`, `globals.css` | ✅ |
| A6 | StatusPill | — | Byte-identical | Matches | None | — | ✅ |

#### B. Companies listing

| # | Item | Old | New | Before | Change | Files | Status |
|---|---|---|---|---|---|---|---|
| B1 | Header | None | "{N} Companies" · "{M} properties total", both unfiltered | None | Rails `meta.scope_total_count` + `meta.property_total_count`; parser, generator, screen | `companies_controller.rb`, `accessible_companies_query.rb`, `envelope.parser.ts`, `session.data.ts`, `companyListing.generator.ts`, `useCompaniesListing.ts`, `companiesListing.screen.tsx`, `companies/page.tsx` | ✅ "217 Companies · 802 properties total"; unchanged while searching |
| B2 | Columns | Company · Regions · Portfolio Groups · PMS Provider · Properties · Users | Company · **Status** · PMS Provider · Properties | Same as old | Dropped Regions, Portfolio Groups and Users; added Status (left) | `companyListing.generator.ts`, strings | ✅ |
| B3 | Status pill | — | Active / Past Due / Onboarding | — | `companies.inactivate` → **Inactive** (neutral), otherwise **Active** (ok) | `companyListing.generator.ts` | ✅ (1 of 217 is Inactive locally) |
| B4 | Search matches status | Name, PMS, contact | Adds `status` | Name, email, PMS (server-side) | Rails search also matches the status words, by prefix | `accessible_companies_query.rb` | ✅ `q=inact` → 1, `q=active` → 216 |
| B5 | Add Company button | Present | Present | Missing | Not built | — | ⚠️ |
| B6 | Row click → company detail | Present | Present | Rows not clickable | Not built | — | ⚠️ |

#### C. Properties listing

| # | Item | Old | New | Before | Change | Files | Status |
|---|---|---|---|---|---|---|---|
| C1 | Header | None | "{N} Properties" · "Across {K} companies", or "Showing {n} of {N}" once filtered | None | Rails `meta.scope_total_count`; K = size of the company filter options | `communities_controller.rb`, `accessible_communities_query.rb`, parser, `propertyListing.generator.ts`, `usePropertiesListing.ts`, screen, `properties/page.tsx` | ✅ "802 Properties · Across 191 companies" / "Showing 637 of 802" |
| C2 | Toolbar | Search 280px + 3 selects + Add | Same, now `flex-wrap:wrap` | Wraps; search 320px | Search max-width 280px | `propertiesListing.screen.tsx`, `globals.css` | ✅ |
| C3 | Filters are multi-select | One value each | Status, Companies, Products, **Data Providers**; OR within a filter, AND across | Three single selects | `MultiFilter` ×4; Rails accepts comma lists (or `[]` arrays); URL `?stage=a,b&company_id=1,2&product=touch&data_provider=yardi,none` | `accessible_communities_query.rb`, `properties.api.ts`, `properties/page.tsx`, `usePropertiesListing.ts`, generator, screen | ✅ |
| C4 | Status options | "All Statuses" + 5 long labels | STAGE_PILL labels, no "All" row | "All Statuses" + 5 pill labels | Dropped the "all" row | `propertyListing.generator.ts` | ✅ |
| C5 | Company options | Every company | Only companies that have properties | Already only companies with visible properties | Dropped the "all" row | `propertyListing.generator.ts` | ✅ (191) |
| C6 | Product options | Pynwheel Touch / Self-Guided Tour / Pynwheel Maps | Touch / Tour / Maps | Old labels | New labels, no "all" row | `propertyListing.generator.ts` | ✅ |
| C7 | Data Providers filter | — | Vendors in scope + "Not connected", sorted, "Not connected" last | — | Rails `meta.filters.data_providers` and a `data_provider` filter; labels from `providerLabel`, which gained `spreadsheet`, `xml`, `rentmanager`, `zaremba` | `accessible_communities_query.rb`, `communities_controller.rb`, parser, both generators | ✅ 12 options |
| C8 | Columns | Property · Company · Status · Integrations · Tour Published | Property · Company · **Go To** · **Products** · **Data Provider** · Status | Same as old | Reordered and replaced | `propertyListing.generator.ts`, strings | ✅ |
| C9 | Go To buttons | — | Inv / Map / Integ / Brand: 52px wide, 15px icon, 8.5px uppercase label, accent on hover; cell padding 10px 16px; header `nowrap` | — | `links` cell → `/properties/:id/inventory`, `/properties/:id/map`, `/integrations?property=:id`, `/properties/:id/branding`. The Hub honours `?property=` through a new `PropertyPreselect` | generator, `CustomTable.tsx`, `connectRoutes.ts`, `integrations/page.tsx`, `PropertyScope.tsx` | ✅ (real ids land on the demo "no such property" state; see Deviations) |
| C10 | Products column | Tags **and** lock/ID/PMS dots | Tags only, centred; "None" when empty | Tags + dots | `tags` cell | generator, `CustomTable.tsx` | ✅ |
| C11 | Data Provider column | — | Vendor pill when connected, else "Not connected" (neutral) | — | Label `providerLabel(data_provider)`; variant from `integrations.pms` (ok with a credential, warn without) | generator | ✅ |
| C12 | Status column | 3rd | Last | 3rd | Moved | generator | ✅ |
| C13 | Tour Published column | Present | Removed | Present | Removed (the model keeps `tourPublished`) | generator, strings | ✅ |
| C14 | Add Property button | Present | Present | Missing | Not built | — | ⚠️ |
| C15 | Row click → property detail | Present | Present | Rows not clickable | Not built in 2c. **Done in 2d** (§15) | — | ⚠️ → ✅ 2d |

#### D. Styling and layout

| # | Item | Change | Status |
|---|---|---|---|
| D1 | Header typography and spacing (A2) | `bo-listing__header`, `__total`, `__summary` | ✅ |
| D2 | MultiFilter skin (A1) | Idle: white, `--bo-line` border, muted text. Active: `--bo-accent-soft` background, accent border and text; 18px count badge; 250–340px panel, radius 11, two-layer shadow | ✅ compared with the rendered design |
| D3 | Go To buttons (C9) | `bo-goto`, `bo-goto__link`, `bo-goto__label` | ✅ |
| D4 | Properties search 280px (C2) | `bo-toolbar__search--narrow` | ✅ |
| D5 | Top-bar sign-out 38×38 (A3) | `bo-iconbutton` restyled (its only user) | ✅ |

#### E. Interactions and behaviour

| # | Item | Change | Status |
|---|---|---|---|
| E1 | MultiFilter | Opening one closes the others; click-away closes; **Done** closes; **Clear** empties that filter; each toggle applies at once. Escape closes and returns focus (added) | ✅ |
| E2 | Rapid toggles | The selection is held in `usePropertiesListing`; every navigation sends all four filters, so a second toggle cannot drop the first while a page loads | ✅ ticked two filters without waiting; both reached the URL |
| E3 | Filter change → page 1 | Existing `useListingParams` behaviour | ✅ |
| E4 | Back/forward and shared links | The selection re-syncs whenever the URL's filters change | ✅ Back restored "Status 2" on page 2 |
| E5 | Sign out from the top bar | Same flow: `POST /api/auth/sign-out` → `/sign-in` | ✅ cookies cleared; the guard then redirects |

#### F. Pagination

| # | Item | Change | Status |
|---|---|---|---|
| F1 | Server-side pager, 10 per page | Kept. Neither design paginates; phase 1b requires it | ✅ |
| F2 | Filters survive paging; paging keeps filters | Existing `keepPage` | ✅ `…&page=2` → "11–20 of 202" |
| F3 | "Showing n of N" agrees with the pager | Both read the filtered `total_count` | ✅ |

#### G. Responsive

| # | Item | Change | Status |
|---|---|---|---|
| G1 | Header wraps | `flex-wrap` | ✅ |
| G2 | Toolbar wraps with four filters | Existing `flex-wrap`; at ≤760px the search takes its own row | ✅ |
| G3 | MultiFilter panel stays on screen | Right-aligns when it would overflow; `max-width: min(340px, 100vw − 32px)` | ✅ |
| G4 | Six-column table on narrow screens | `bo-panel__scroll` scrolls sideways inside the panel | ✅ no page overflow at 1024px or 390px |
| G5 | Collapsed sidebar (≤1100px) | The sign-out button no longer overflows the 72px rail (A3) | ✅ |

### Decisions

1. **Filters stay server-side.** Multi-select needed the Rails query objects to accept lists. That is a query-parameter change on the existing `format.json` branches: no schema change, route change or new endpoint, and the HTML paths are untouched.
2. **URL format:** one comma-separated parameter per filter (`stage=released,approval`). Rails also accepts `stage[]=…`. `none` means "no data provider". The old single-select value `all` is ignored, so bookmarks from before this phase still work.
3. **Header totals come from Rails**, because one page of rows cannot produce them: `scope_total_count` (both listings) and `property_total_count` (Companies). "Across K companies" reuses the company filter's option count.
4. **Company status** is `inactivate` → Inactive, otherwise Active. The CMS has no per-company billing or onboarding state.
5. **Go To targets** are the React screens the design names. Integrations Hub has no property-scoped route and has its own property picker, so the link is `/integrations?property=:id`. `PropertyPreselect` selects that property once and then lets the picker take over. The strict `PropertyScope` would have reverted every change made in the picker.
6. **The record count left the top bar** (A4) rather than appearing twice.

### Deviations from the reference

| Design | Here | Why |
|---|---|---|
| 7-stage lifecycle (Order Received … Orientation) in the Status pill and filter | The 5 real milestone stages (Installed, Activated, In Production, Final Approval, Released) | Only four milestone dates exist on `communities`; nothing records order, payment, installation or orientation |
| Company status Active / Past Due / Onboarding | Active / Inactive | See decision 4 |
| Add Company, Add Property (B5, C14) | Not rendered | Present in **both** designs. A real create needs a write path, which is still the open "read-only or real writes?" question (§11) |
| Row click opens detail (B6, C15) | Rows are not links | Present in both designs. Detail screens still run on demo ids. *Update, 2d:* C15 is done, and Properties rows open the real Property Detail (§15). B6 (Companies) is still open |
| Go To opens that property's screens | Real (numeric) ids reach the explicit "No demo property with the id …" state | The destinations are demo screens until phase 3. The links are correct, so they will work unchanged once those screens read real data |
| Products filter lists only products some property has | Always Touch, Tour, Maps | All three exist in the data (543 / 226 / 76) |
| Search matches status by substring | By prefix | With Active/Inactive, a substring match makes "active" find every company |
| No pager | Server pager kept | Phase 1b requirement |
| Properties search looks ~190px wide | 280px (its `max-width`) | In the design it shares the row with the Add button, which is not rendered |
| — | Escape closes a filter; panel flips left near the right edge; search on its own row at ≤760px | Accessibility and phone widths; the design has no responsive rules |

### Verification (Sep 24, local DB, super admin)

- **Rails** (`rails runner` and HTTP): the stage counts partition the 802 properties (113 / 592 / 44 / 8 / 45). Multi-value results equal the sums: `yardi,psi` = 86 + 137. `none` = 30. Unknown values are ignored. Search + 3 filters pages correctly (41 rows, 5 pages).
- **UI** (Playwright in real Chrome, 1440 / 1024 / 390px): the header, columns, pills, Go To links, all four filters, paging, Clear, Back, deep links and the empty state all behave as listed above. No console errors from this work. The only console output is Next's existing warning about the sidebar logo `<Image>` sizing.
- **Compared** side by side with the 22-Sep file rendered at 1440px: the listings, the filter panel and the top bar match, except for the deviations above.
- **Sign In:** the page renders; a wrong password shows Devise's "Invalid Email or password."; the guard redirects; sign-out clears both cookies. A *successful* sign-in was not re-run, because the password is not recorded. The local checks used a session minted with `rails runner`. The sign-in route handler itself is unchanged.
- `npm run typecheck` ✅ · `npm run build` ✅
- `npm run test:e2e`: **51 passed, 29 failed**. All 29 fail on one thing: `fonts.gstatic.com` resets connections from this machine (`curl` fails the same way), and the "no console errors" check counts the failed font request. Each of those tests' content assertions passed. Re-run on a network that reaches Google Fonts.

### Remaining / follow-up

1. Add Company / Add Property, and row click → detail: after the phase 3 decision on writes, and once detail screens read real data. *(Properties row click: done in 2d, §15. Company row click: still open.)*
2. When Inventory, Map, Branding and Integrations become real (phase 3), the Go To links need no change.
3. If the business adds a richer lifecycle or company billing status, extend `STAGE_CONDITIONS` / `STAGE_PILL` and the company status mapping.
4. `Connect::CompanySerializer` still computes region, portfolio group and user counts that the listing no longer shows. That is three grouped queries per page; drop them if nothing else needs them.
5. The Companies filter lists 191 companies in a 274px scroll with no search box, as the design has it. A search field inside the panel would help.
6. Deploy to staging when wanted. Heroku still runs the pre-2c commits (§8), and this phase changes both apps: Rails (the query objects and controllers) and Connect.

---

## 15. Phase 2d: Property Detail on real data (September 24, 2026)

**Brief:** [properties_detail_feature.md](properties_detail_feature.md) (untracked, like the other briefs). Build the Property Detail page of `pyn-connect-22-sep-new.html` so it opens from a Properties row and shows the selected property's **real** data. **No backend changes of any kind.** Anything the existing backend does not expose to React is left out and recorded in [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md).

**Branch:** `feature/properties_detail_page`, cut from `main` at `c9416ae67`. **Uncommitted**: no commit or PR yet.

### Investigation completed

- **Designs.** Both files extracted as in §13. `isPropertyDetail` differs a lot between them:
  - The old file has a dark "Live Products" bar, a 5-step "Deployment Lifecycle", Design System and QR cards, Map Configuration, and Integrations / White-Label links.
  - The 22-Sep file has a "Manage This Property" bar, a 7-step "Property Launch Lifecycle", **Property Profile** (4 groups plus an inline edit form), Products + Inventory, ILS Syndication, **Property Settings** (3 groups), Touch / Tour / Maps config cards and the **Billing Rate Card**.
  - A render of the 22-Sep screen at 1440px was the visual reference.
- **Rails, the old Property Detail flow.**
  - `GET /companies/:cid/communities/:id/edit` → `CommunitiesController#edit` → `communities/_form.html.haml` → `PATCH …#update` (`community_params`).
  - Settings: `communities/settings_page.html.haml` (products, Touch code, billing rates, Community Logo, Inactivate) and the legacy Floorplates page `floorplates/index.html.haml`, whose form posts to `CommunitiesController#save_apartment_settings` (pricing and unit-display flags, Student Housing).
  - Models: `Community` has many `units`, `floorplans`, `floorplates`, `amenities` and `sub_communities`; it has one `tour` (`tour_stops`), `credential` and `design`. Each field's column is in the gaps doc.
- **What React can reach.** Only `GET /communities.json` (the Connect listing row). There is no JSON for the edit or settings pages, and no id filter. api/v2 uses token auth, and the kiosk and SDK feeds are unauthenticated or partner-keyed (gaps doc §1).
- **React.** `/properties/[propId]` rendered phase 2's demo `PropertyDetailScreen` (old design, demo slugs only). A real id reached "No demo property". Listing rows were not clickable (§14, C15).

### Change and data-source map

| # | New UI section | Old UI / Rails source | Existing React | Backend data | Available to React? | Change made |
|---|---|---|---|---|---|---|
| 1 | Row click → detail | `openProp(p.id)` in both designs | `CustomTable` rows inert | Row `id` | ✅ | `RowDescriptor.href`; the row opens it and the title cell is a `next/link` |
| 2 | Breadcrumb, title, status pill, subtitle | Legacy breadcrumbs; `stage` | Demo screen only | `name`, `stage`, `company_name`, `city`/`state`, `unit_count` | ✅ | New real screen; reuses `StatusPill` and `STAGE_PILL` |
| 3 | Manage This Property | Legacy side menu | Route helpers from the Go To buttons | Row `id` | ✅ (nav only) | Links to the same 4 routes; destinations are still demo (gap G14) |
| 4 | Property Launch Lifecycle | Four milestone dates | Demo `generateStageSteps` (mock stages) | `stage` | ✅ current stage; ❌ dates, 7-stage model, setting a stage | 5 real stages, read-only (G11) |
| 5 | Profile: Location | `_form`: `name`, `address`, `city`, `state`, `zip`, `latitude`/`longitude`, `manual_lat_long` | — | `name`, `city`, `state` | Partly | Name and City · State shown; Street, ZIP and coordinates left out (G2) |
| 6 | Profile: Leasing Contact | `_form`: `phone`, `email`, `website` | — | — | ❌ | Group not rendered (G3) |
| 7 | Profile: On-Site Team | `_form`: `property_manager_*` | — | — | ❌ | Group not rendered (G4) |
| 8 | Profile: Configuration | `_form`: `number_of_units`, `is_sitemap`, `description` | — | `unit_count` | Partly | Units shown; Map mode and Notes left out (G5) |
| 9 | Edit Details | `CommunitiesController#edit/update` | Demo modal | — | ❌ writes | Opens the legacy form in a new tab (G6) |
| 10 | Products | `touchscreen_app`, `self_tour`, `product_options`, `enable_sdk_map` | Demo toggles | `products.*`, `tour_published`, `unit_count` | ✅ read; ❌ write and counts | Read-only switches; real metric lines (G7) |
| 11 | Inventory | `floorplans`, `floorplates`, `amenities`, `sub_communities`, `units` | Demo cards | `unit_count` | Units only | Units card and Manage Inventory link; the rest left out (G8) |
| 12 | Property Settings | `save_apartment_settings` columns; `community_logo`, `locked` | Demo | — | ❌ | Not rendered (G9) |
| 13 | Billing Rate Card | `billing_rate_*`, `billing_month`, `billing_type` | Demo | — | ❌ | Not rendered (G10) |
| 14 | Touch / Tour / Maps config cards | `code`, `is_vertical_app`, `mdu`, `enable_locks`, `is_beans_svg`, … | Demo | — | ❌ | Not rendered (G12) |
| 15 | ILS Syndication | `PartnerConfigurationsController`, `MAP_PARTNER_KEYS` | Demo | — | ❌ | Not rendered (G13) |
| 16 | Loading, not found, load failed | — | Listing loading only | Lookup status | ✅ | `[propId]/loading.tsx`; "Property not found"; error banner |

### Sections implemented, one item at a time

1. **Row click** on the Properties listing opens `/properties/:id`. The title is a real link, so keyboard, middle-click and new-tab all work. Clicks on the Go To buttons stay theirs.
2. **Lookup** (`lookupProperty`): walks `GET /communities.json` at `per_page=100`, fetching the first page and then the rest in parallel. It honours the user's scope, so an id outside it shows "Property not found". A 401 redirects to Sign In.
3. **Route:** a numeric id renders the real screen. A slug (`luxe`, `cortsky`, …) still renders the demo screen, so the Dashboard, the global search and the demo sub-screens keep working.
4. **Header:** breadcrumb, name, stage pill, company · city · units.
5. **Manage This Property.**
6. **Property Launch Lifecycle:** 5 real stages, read-only.
7. **Property Profile:** real fields only, plus "Edit Details" → legacy CMS.
8. **Products:** read-only switches.
9. **Inventory:** Units and Manage Inventory.
10. **States and layout:** loading, not found, load failed; responsive CSS.

### Components reused

`ConnectScreenTemplate`, `ListingScreenTemplate` (loading), `StatusPill` (listing variant), `Icon` (the design's icon sheet), `CustomTable`, `STAGE_PILL`, `formatCount`, the route helpers (`tourContentRoute`, `mapEditorRoute`, `propIntegrationsRoute`, `brandingRoute`, `propRoute`), `parseProperties`, `parseListingMeta`, `fetchProperties`, `readRailsCookie`, the `CORE_STRINGS` / `i18n` registry, and the `.bo-error` / `.bo-empty` styles.

### New components, and why

| New | Why an existing one would not do |
|---|---|
| `molecules/DetailSection` | No section card existed; the demo screens inline the markup. It holds the heading, subtitle, icon and actions pattern the design repeats on every panel |
| `atoms/Switch` | No toggle component existed; the demo screens inline it. It is read-only on purpose (`role="img"`, labelled), because Connect has no write path |
| `atoms/Icons` → `ExternalLinkIcon` | Marks "Edit Details" as leaving Connect |
| `screens/properties/propertyDetail.screen.tsx`, `hooks/usePropertyDetail.ts`, `generator/propertyDetail.generator.ts`, `repository/remote/propertyLookup.server.ts` | The real-data layers (route → API → parser → hook → generator → screen), next to the listing's. The demo `connect/properties/propertyDetail.screen.tsx` is untouched |

### Real backend data consumed

`communities.json` row fields: `id`, `name`, `city`, `state`, `unit_count`, `company_id`, `company_name`, `stage`, `products`, `tour_published`. The full table is in the gaps doc §2.

### Testing completed (Sep 24, local DB, real Chrome through Playwright)

The session was minted with `rails runner` (password not recorded). Rails ran on **:3100**, because another local app (ezofficeinventory) took :3000 and this repo's Rails was killed (trap 17).

| Check | Result |
|---|---|
| Listing → detail by clicking a row's company cell | `/properties/503`; name, pill and company match the row |
| Title link on a filtered page 3 (`?page=3&product=tour`), then Back | Right record (1044); Back restores the filter and the page |
| Keyboard: Enter on a focused title link | Opens the property |
| Go To button inside a row | Its own target, not the detail page |
| Last property by name (919, page 9 of 9) | Found, ~3.1 s (dev, 9 listing requests) |
| Maps on (1411), Final Approval (1990), blank city (1107) | Switches, metrics and stepper correct; the city shows "—" |
| Unknown id (999999999) | "Property not found" and a way back |
| Company admin (`jleinweber@zaremba.net`): own 364 / own but locked 366 / other company 503 | Found / not found / not found; one listing request (~0.3 s server-side) |
| Signed out | Redirects to `/sign-in` |
| Breadcrumb → Properties | ✅ |
| Demo `/properties/luxe` | Still the demo screen |
| 1440 / 1024 / 390px | No page or content overflow; the stepper scrolls at 390px |
| Regression | Companies (217 · 802 total, paging, rows not clickable), Properties header / filter / search, Sign In, `/api/health` |
| Console | No errors from the app. Two navigations stalled on Google Fonts (trap 18) |
| `npm run typecheck` / `npm run build` | ✅ / ✅ |
| `npm run test:e2e` | **51 passed, 29 failed**, the same as §14. Every failure is the `fonts.gstatic.com` request (trap 18) |

### Files

- **Changed:**
  - `pyn-connect-web/src/app/(connect)/properties/[propId]/page.tsx`
  - `core/components/organisms/CustomTable.tsx`
  - `core/components/atoms/Icons.tsx`
  - `core/utils/generator/listing.types.ts`
  - `core/utils/generator/propertyListing.generator.ts`
  - `core/repository/remote/api/properties.api.ts` (`perPage`)
  - `config/app/urls.ts`
  - `config/app/strings.ts`
  - `resources/i18n/index.ts`
  - `app/globals.css`
- **Added:**
  - `app/(connect)/properties/[propId]/loading.tsx`
  - `core/repository/remote/propertyLookup.server.ts`
  - `core/utils/generator/propertyDetail.generator.ts`
  - `core/hooks/usePropertyDetail.ts`
  - `core/screens/properties/propertyDetail.screen.tsx`
  - `core/components/molecules/DetailSection.tsx`
  - `core/components/atoms/Switch.tsx`
- **Docs:**
  - `gaps_properties_detail_feature.md` (new)
  - this section and §1, §2, §4–§7, §10–§14 notes
  - context.md §4, §8–§11
  - react-architecture.md §20 (Sep 24 entry)
- **Rails:** none. The locally modified `bin/*`, `config/database.yml`, `db/schema.rb` and `app/.DS_Store` predate this phase and stay uncommitted (§12).

### Remaining gaps

See [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md) (G1–G14). In short:
- no single-property JSON, so the page scans the listing
- no JSON for address, ZIP, coordinates, contacts, manager, website, notes, map mode, settings, billing, per-product config, ILS, or floorplan / floorplate / amenity / sub-community counts
- no write path for any of them

### Decisions

1. **Leave out rather than fake.** Sections and fields with no reachable data are not rendered, as the brief asked; the gaps doc lists every one.
2. **No HTML scraping** of the legacy edit and settings pages. It is brittle, and it would change the legacy session's current company.
3. **"Edit Details" hands off** to the legacy form (an existing route) in a new tab, so editing is still possible today.
4. **Demo slugs keep the demo screen** until phase 3 retires the demo data.
5. **Lifecycle order** follows the serializer's ranking: Installed → Activated → Production → Final Approval → Released. The mock `STAGES` list puts Final Approval after Released.

### Follow-ups

1. **Commit the work and open a PR** (no AI attribution, decision 11). Include `gaps_properties_detail_feature.md`. Leave the untracked briefs and the local environment edits out.
2. **Backend, when approved:** a single-property JSON (`communities#show` + `Connect::PropertyDetailSerializer`, scoped by `AccessibleCommunitiesQuery`). Then swap `lookupProperty` for one request and add the sections the gaps doc lists. The screen only needs new generator descriptors.
3. **Writes** (Edit Details, product toggles, settings, rates) wait on the phase 3 "read-only or real writes?" decision (§11). Until then "Edit Details" hands off to the legacy form.
4. **Manage This Property / Inventory links** lead to demo screens for real ids (gap G14). They need no change once those screens read real data.
5. **Deploy to staging** when wanted. 2d changes only Connect (`pyn-system-connect`); Heroku still runs pre-2c commits (§8).
6. **Company row click (B6)** can reuse `RowDescriptor.href` once Company detail reads real data.

---

## 16. Phase 2d-r: Property Detail under the revised backend rule (September 24, 2026)

**Rule change:** [properties_detail_feature.md](properties_detail_feature.md) §9a relaxes "no backend changes". A minimal, **read-only JSON branch on an existing controller action** is allowed when it only exposes existing data. Business logic, authorization, queries, scopes, models, associations, schema and write behaviour must not change, and Connect stays read-only.

**Branch:** `feature/properties_detail_page`, on top of `ef9e4549a`. Staged; not yet committed.

### Controller changed

| File | Change |
|---|---|
| `app/controllers/communities_controller.rb` | `#edit` (the legacy Property Details action) starts with `return render_connect_property_detail if request.format.json?`, the same guard `#index` uses for the listing. The new private `render_connect_property_detail` finds the community in `AccessibleCommunitiesQuery.new(current_user).call` (the listing's scope) and answers 404 outside it. The HTML path is untouched |
| `app/serializers/connect/property_detail_serializer.rb` (new) | Presentation only, following the existing `Connect::*Serializer` convention. It reuses `Connect::PropertySerializer` for the row fields (stage, products, unit count) |

- **Endpoint:** `GET /communities/:id/edit.json`. The shallow route already existed, so no route was added. It needs a Devise session: signed out gives 401.
- **Why `#edit`:** it is the legacy page whose record (`@community`, via `set_community`) holds every field the design shows. The Settings and Floorplates pages read the same record. `#settings_page` was not used because it *creates* a Tour/TourSetting when they are missing. The inventory controllers are left to the Inventory branch.

### JSON exposed, and where each part comes from

| Key | Source (existing) |
|---|---|
| row fields (`id`, `name`, `stage`, `products`, …) | `Connect::PropertySerializer`, unchanged |
| `profile` | `communities.address`, `city`, `state`, `zip`, `latitude`, `longitude`, `manual_lat_long`, `phone`, `email`, `website`, `property_manager_*`, `number_of_units`, `is_sitemap`, `description`. These are the fields of `communities/_form.html.haml` |
| `milestones` | `date_activated`, `production_started_date`, `submitted_final_approval_date`, `released_date` |
| `settings` | The 14 flags of `floorplates/index.html.haml` (`save_apartment_settings`), plus `community_logo` and `locked` from `settings_page.html.haml` |
| `billing` | `billing_rate_touch`, `billing_rate_selftour`, `lincoln_billing_rate`, `dwelo_billing_rate`, `billing_rate_maps`, `billing_rate_for_both`, `billing_type`, `billing_month`, and `self_tour_rate_field`. The last mirrors the view's own test: Lincoln company → Lincoln rate; Dwelo-admin creator → Dwelo rate |
| `touch` | `code`, `is_vertical_app`, `date_installed` (the legacy "Subscription Start Date"), `mdu`, `show_gesture_icons`, `powered_by_btn` |
| `tour` | `Community#community_tour` → `tour_stops.size`, `visual_id_verification`; `enable_locks`, `auto_wayfinding` |
| `maps` | `web_map_type`, `default_satellite_view`, `default_map_floor` with its label from `Community#property_floor_options`; `enable_three_d_maps`, `is_beans_svg`, `enable_svg_mode`, `enable_sdk_map`, `enable_floorplan_level_color`, `highlight_all_units_on_hover` |
| `inventory` | Counts of the existing `units`, `floorplans`, `floorplates` and `amenities` associations. Sub-communities come from `Community#fetch_multi_properties`, with unit counts from `units` grouped by `property_id` |
| `partners` | `Community::MAP_PARTNERS` + `Community#partner_map_enabled?` (as in `PartnerConfigurationsController#enabled_partners`) |

### Confirmations

- **Business logic unchanged.** No rule, calculation, validation, scope, association or model method was changed or added. The serializer only reads columns and calls existing methods.
- **Authorization unchanged** for every existing path. The new JSON branch applies the existing Connect listing scope; the HTML `#edit` behaves exactly as before (verified: HTML edit 200).
- **No schema change, migration or new column.** No route was added.
- **Writes remain disabled.** "Edit Details" and "Edit Rates" open the design's forms, prefilled from the record. "Save Changes" sends **no request**: verified, no non-GET request fired. It shows "Connect is read-only for now, so nothing was saved", with a link to the legacy form. Every toggle is a read-only indicator.

### Frontend

- **Data path:** `fetchPropertyDetail` (API) → `parsePropertyDetail` (parser; the only place snake_case is read) → the `PropertyDetail` model → `propertyDetail.generator.ts` (pure descriptors) → `usePropertyDetail` (view plus local drafts) → the screen.
- **Removed:** `propertyLookup.server.ts` (the listing scan).
- **Sections now on real data:**
  - header
  - Manage This Property
  - lifecycle, with each stage's recorded date
  - the full four-group Profile
  - Products (units · floorplates, tour stops)
  - Inventory (4 counts, sub-communities)
  - ILS Syndication
  - Property Settings (3 groups)
  - the Touch, Tour and Maps cards (dimmed with the design's note when the product is off)
  - Billing Rate Card
- **Reused:** `DetailSection`, `Switch`, `StatusPill`, `Icon`, `STAGE_PILL`, the route helpers and `.bo-field`. New CSS covers the forms, notice, config cards, ILS grid and rate cards.

### Verified (local DB, real Chrome, super admin and company admin)

- **1411:**
  - every value matches `psql`: 2500 Larimer St, 80216, 39.757643, 303-640-3652; Touch Code "John Demo"; start Jun 19, 2019; rates "0" → $0; January; 230 / 8 / 4 / 7; 5 stops
  - page loads in ~0.64 s; the endpoint answers in 0.1–0.35 s
- **4331:** sub-communities 122 / 77 / 267 (= 466 units).
- **Scope:** company admin 364 ✅, 366 (locked) → not found, 503 (other company) → not found. Missing id → not found; signed out → 401 → Sign In.
- **Navigation:** the listing row click and the demo slug `/properties/luxe` still work.
- **Layout:** no overflow at 1440 / 1024 / 390px.
- **Console:** no errors.
- **Checks:** the staged snapshot passes `tsc` and `next build` on its own (the untracked Inventory files are excluded).

### Remaining gaps

In [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md) §0:
- **R1:** the 7-stage lifecycle (no columns)
- **R2:** QR codes (no data)
- **R3:** a separate tour subscription date
- **R4:** Maps pins/paths (undefined)
- **R5:** writes, disabled by rule

G14 (the demo destinations) is unchanged.

### Note: working-tree files restored outside git (Sep 24, 19:33)

Between the `ef9e4549a` commit (19:19) and this revision, tracked files were restored to `HEAD` outside git (no git command in the reflog did it). That affected:
- the Inventory work's edits to tracked files (4 controllers, strings, i18n, urls, Icons, Switch, `shell.reducers.ts`, gaps §4 onward)
- the local `config/database.yml`, `bin/*` and `db/schema.rb` edits

The untracked Inventory files are still present. None of these files were touched by this revision.

---

## 17. Phase 2e: Property Inventory on real data (September 24, 2026)

**Brief:** `feature_inventory_page.md` (untracked, like the other briefs). Build the 22-Sep design's Property Inventory (`tourContent`) for a real property, opening it from Property Detail → Inventory and from Properties → Go To → Inv. Everything must read the real DB through the existing controllers. Every write must stay a no-op, and nothing may be faked.

**Backend rule, as revised by the user mid-task:** the brief said "no backend changes". The investigation showed no inventory controller answered JSON, so nothing could be read. The user then approved **read-only JSON on the existing controllers**, "just the change of returning the data in the required format, no change in business logic or flow" (the same rule as 2d-r, §16). Saved as feedback memory `connect-json-branch-exception`.

**Branch:** `feature/inventory_implementation`, fast-forwarded onto `feature/properties_detail_page` (`824c1f07a`) after the user committed 2d-r. **Uncommitted.** When 2d-r was committed from another session, this branch's edits to *tracked* files disappeared from the working tree, and all of them were re-applied. The untracked files were never lost.

### Investigation completed

- **Docs and designs.** Both HTML files were extracted as in §13. The 22-Sep `tourContent` block is 57 KB, with four tabs:
  - Floorplates, with the Background Library
  - Floorplans, with a filter toolbar
  - Units, with ten filters
  - Amenities

  The dialogs are Floorplate (changed from the old design), Floor Plan (changed) and Mass Override (changed). New in 22-Sep: Unit, image preview, gallery and badges. Confirm and the generic form are identical to the old design. The old demo Inventory screen (phase 2) follows the *old* design and runs on the demo slice.

- **Rails flows traced:**

| Page | Route → action | Query | View |
|---|---|---|---|
| Floorplates | `GET /communities/:id/floorplates` → `FloorplatesController#index` | `current_community.floorplates.order(id: :desc)` (association default `number DESC`) | `floorplates/index.html.haml`: name, range, `validated_image_url \|\| validated_svg_image_url`; building column commented out |
| Floor plans | `GET /communities/:id/floorplans` → `FloorplansController#index` | `@community.floorplans.order(id: :desc)` | `floorplans/_index.html.haml`: name, SF/BR/BA, image; red cells from `*_is_updated` |
| Units | `GET /communities/:id/units` → `UnitsController#index` | `UnitFilterQuery.new(@community, filter_params).results.includes(:door)`, paged 25–200 (All ≤ 2000) | `units/_units_table.html.haml` (XHR partial) |
| Amenities | `GET /communities/:id/amenities` → `AmenitiesController#index` | `current_community.amenities.order(id: :desc)` | `amenities/_index.html.haml` ("Amenity Images") |

- **Associations used:**
  - `Unit#floorplan` joins on `units.floorplan_id = floorplans.provider_floorplan_id` (not the primary key).
  - `Floorplate#floors` / `#fetch_units` gives the visible units on its floors.
  - Plotted means `Unit#plotted_on_map?`: x/y > 0, or an SVG pointer.
  - Amenities are polymorphic. With no owner, an amenity is not placed; owned by a Floorplate or the Sitemap, it is plotted (a tour stop is `tour_stops.stop_type = 'amenity'`); owned by a Floorplan or Unit, it is an interior image.
  - The gallery is `amenity_galleries`.
  - Locks: `unit.door.lock_provider` or `units.lock_provider`. Devices come from `AssignLocksHelper#all_locks` (DB only); a lock's `stop_id` is the door.

- **Ruled out as data sources:**
  - `api/v1/communities/:id/data.json` (kiosk): only available, map-visible units; writes an `impressions` row with the whole body per call.
  - `unit_and_floorplan_data`: calls PSI and saves units.
  - The `suggest_*` / `*_auto_plot_units` GETs: they write.
  - `api/v1/floorplans`: token auth, available-only.
  - The SVG optimizer JSON: super-admin only.
  - Scraping the HTML: partial fields, brittle, and GETs create SchedulerWidgetSettings.

### Change and data-source map

| UI feature | Old Rails source | Model / association | Existing React | Real data? | Implementation | Gap |
|---|---|---|---|---|---|---|
| Inventory route and navigation | Side-menu pages | Community id | `/properties/[propId]/inventory` (demo `PropertyScope`); links from listing Go To and Property Detail | ✅ | Numeric id → real screen; slug → demo, unchanged | — |
| Header and summary | Breadcrumbs; tour stops | `floorplates.svg_image`; `community_tour.tour_stops` | Demo header | ✅ counts; ❌ publish state | "N floorplates · M without a floor SVG · K tour stops" | G16 |
| Summary cards (tab counts) | 4 index pages | floorplates / floorplans / units / amenities | Demo tabs | ✅ | Tab badges | — |
| Floorplate cards | `floorplates#index` | name, range, floors, building, floor_name(_added), manual_override, image, svg_image, width/height, svg_metadata; `fetch_units`; `amenities` | Demo cards (old design) | ✅ | `floorplates.json` → `Connect::FloorplateSerializer` | — |
| Floorplate images and viewer | image / svg uploaders | `standard_image_url`, `svg_image` | None | ✅ | Thumbnail (raster first, as the legacy table) + `ImageViewer` | — |
| Background Library | Beans uploader on the floorplates page | `communities.background_svg_image` | None | Partly | Real shared background, else empty state; adding disabled | G15, G19 |
| Floorplate actions | create/update/destroy, plotexp | — | Demo dialog | n/a | Dialog prefilled; Save closes; Delete → confirm; Plotting → Map & Plotting | G20 |
| Floor plan cards | `floorplans#index` | name, provider id, beds/baths, sq ft, market_rent, `*_is_updated`, manual_override, images, 3 buttons, `availability_status`; units by provider id; interior images | Demo | ✅ | `floorplans.json` → `Connect::FloorplanSerializer` | G17 (badges) |
| Floor plan filters | — | Same fields | — | ✅ | Search, Layout, Baths, Sq Ft, Setup (in-browser) | — |
| Add Floor Plan dialog | floorplans/_form | Same | Demo (old design) | ✅ prefill | 22-Sep dialog; Save closes | G18, G20 |
| Unit cards | `units#index` | Every unit column the grid and form show, `FEED_OVERRIDE_FLAGS`, door lock, interior images | Demo | ✅ | `units.json` → `Connect::UnitSerializer` | — |
| Unit filters and search | UnitFilterQuery | Same semantics | — | ✅ | 10 filters + search (in-browser) | G21 (states) |
| Unit image viewer | unit / floor plan images | `standard_image_url`, secondary, interiors, plan image | — | ✅ | `ImageViewer` gallery | — |
| Re-sync from PMS | `communities#import` / `update_community_data` | — | Demo confirm | n/a | Shared confirm, no action | G20 |
| Mass Overrides | `set_manual_override`, `set_available` | — | Demo dialog | n/a | 22-Sep dialog, scope = filtered count; Apply closes | G20 |
| Add Unit | units#new / create | — | — | ✅ options | 22-Sep dialog; lock types per `Community#lock_options`; devices from `all_locks` | G20 |
| Amenities | `amenities#index` | name, `amenity_type`, owner, floor/building, plotted, image, gallery, tour stop; `Amenity::AMENITY_TYPE` | Demo | ✅ | `amenities.json` → `Connect::AmenitySerializer` | — |

### Backend (read-only JSON on existing actions)

- `app/controllers/concerns/connect/inventory_json.rb` does three things:
  - It skips `community_code` and `load_tour_users_chats` only when `action_name == 'index' && request.format.json?`. This is one predicate on purpose: a skip carrying both `only:` and `if:` is skipped when *either* holds (verified in ActiveSupport 7.2.2 `merge_conditional_options`).
  - It renders the Connect envelope.
  - It adds `meta.property` (id, name, company).
- The four controllers each gained an `include` and one `return render_connect_* if request.format.json?` right after their existing query. The Units branch returns before pagination (which writes `session[:units_per_page]`) and before the `welcome_unit_page` update.
- **Serializers:** `Connect::FloorplateSerializer`, `FloorplanSerializer`, `UnitSerializer`, `AmenitySerializer`, and `Connect::UploadUrl`.
  - `UploadUrl` resolves images as `S3Acceleration#validated_image_url` does (`standard_image_url` → accelerate). It reads presence from the column, because dev's `:file` storage makes `uploader.present?` false.
  - Counts are one grouped query each, not per row.
- **Meta per endpoint:**
  - floorplates: `map_type`, `svg_mode`, `tour_stop_count`, `shared_background`, `sitemap`
  - floorplans: `currency_symbol`, `turn_availability_on`
  - units: `currency_symbol`, `data_provider`, `last_sync` (`data_provider_updated_on`), `lock_devices`
  - amenities: `category_options` (`Amenity::AMENITY_TYPE`)
- **Timing** (local, serializer only): 1,169 units in ≈0.3 s, about 1.2 MB of JSON; 305 units ≈ 340 KB.

### Frontend

**Layering:** route → `propertyInventory.server.ts` (four listings in parallel) → `inventory.parser.ts` → `propertyInventory.data.ts` → hooks (`usePropertyInventory`, `useInventoryFloorplans`, `useInventoryUnits`, `useClientPages`) → generators (`core/utils/generator/inventory/*`) → `screens/properties/propertyInventory.screen.tsx` and the section and dialog files in `screens/properties/inventory/`.

- **Route:** numeric ids load the real screen, and slugs keep the demo one. `?tab=` picks the tab, and switching tabs uses `history.replaceState`, so there is no refetch. "Today" is computed on the server in the CMS zone (Eastern), so "available now" matches `Date.current` and hydration cannot disagree. A 401 redirects to Sign In; 302/404 shows "Property not found"; other failures show a load-failed banner. `inventory/loading.tsx` shows "Loading inventory…".
- **Floorplates:** cards ordered by lowest floor. They show:
  - SVG Ready/Missing
  - range ("Floors 1–3"), naming (Manual name / Auto from range), name on map (Shown · P1 / Hidden), building, background
  - units and amenities with plotted counts
  - thumbnail with View / Replace / Remove, the Plotting link, and Edit/Delete

  Sitemap-mode properties get a property-map panel. The Background Library is described in G15.
- **Floorplans:** cards show:
  - provider ID, layout, sq ft and base price with Feed/Manual tags from the `*_is_updated` flags
  - units ("54 units · 1 available")
  - chips: buttons configured (a button counts when it has a URL), interior images, secondary image
  - the status pill only when `turn_availability_on`, and a Manual Override pill

  Filters: search (name, provider ID), Layout, Baths, Sq Ft, Setup. Pages of 20.
- **Units:** pages of 25.
  - Search takes comma-separated terms and `*` as a start-anchored wildcard, like UnitFilterQuery, over the display name, marketing name, provider ID and plan name.
  - Filters: Floor Plan (+ No floor plan), Availability (now / soon / not available / sold), Building (+ No building), State (plotted / not on map / model / manual overrides / no photos), Beds, Baths, Floors (+ No floor), Price, Sq Ft (the unit's own, else the plan's). OR within a filter, AND across.
  - Card meta: Provider ID, Floor plan, Layout, Price, Sq Ft, Available, Placement, Lock ("Zerv" shows as Pynwheel Access), Tour order, Unit status. Tags come from `FEED_OVERRIDE_FLAGS` and are shown only for fed records (`provider` present and not `manually`).
  - Pills: availability, Plotted / Not on map, Model Unit, Manual Override.
  - The title opens the unit's dialog.
- **Amenities:** property amenities only (unplaced or plotted). Each card shows where it is ("Floor 1 · Bldg", "Property map", "Not placed on a map"), a Tour stop pill, the category in a disabled select, and the gallery strip with previews. Reorder and remove are disabled. Pages of 20.
- **Dialogs** (22-Sep markup): Floorplate, Floor Plan, Unit, Amenity, Mass Override. Local form state only: picked files become local object URLs and are never uploaded. HTML descriptions are shown as plain text. Every footer says saving changes nothing. Confirms (Delete / Remove / Re-sync) reuse the shared `ConfirmDialog` with `action: null`, and their message says confirming changes nothing.
- **Viewer:** one lightbox for single images and galleries. Arrows, keyboard ←/→, thumbnails, Escape or backdrop to close (Escape closes only the topmost dialog), and a "could not be loaded" state.

### Components reused

- `ConnectScreenTemplate`, `ListingScreenTemplate` (loading)
- `DetailSection` (every panel), `StatusPill`, `MultiFilter`, `SearchField`
- `Pagination` + `generatePager` (client-side paging)
- The shared `ConfirmDialog`: its `askConfirm` payload now allows `action: null`
- `Switch` (gained an optional `onToggle` for dialogs; read-only use unchanged)
- The icon module (gained icons), `formatCount`, the `CORE_STRINGS`/`i18n` registry
- `.bo-field`, `.bo-section`, `.bo-linkbutton`, `.bo-error`, and the route helpers (`mapEditorRoute`, `tourSetupRoute`, `propRoute`)

### New components, and why

| New | Why nothing existing would do |
|---|---|
| `molecules/Modal` | The app had no dialog shell. Each phase-2 dialog inlines its own overlay and is wired to demo state, with a Save that mutates demo data and toasts. This shell adds a portal, Escape for the topmost dialog, focus return and a body scroll lock |
| `organisms/ImageViewer` | No image viewer existed (the design's `imgPreviewOpen` and `galleryOpen` are new in 22-Sep) |
| `molecules/RecordCard`, `MediaThumb`, `MetaGrid` | The card layout (image, details, actions), the thumbnail with hover actions and a missing-file state, and the label/value grid with source tags repeat across all four tabs; no equivalent existed |
| `molecules/RangeFilter` | The design's min–max box; the toolbars had only search and multi-select |
| `molecules/UploadSlot` | The design's `ImageUploader.dc.html`; no uploader component existed |
| `molecules/Breadcrumb` | Three-level breadcrumb; 2d's is a private component inside its screen |
| `atoms/IconButton`, `SourceTag`, `SafeImage` | Square icon buttons (used about 40 times), the Feed/Manual tag, and an `<img>` that shows a label when the S3 file is missing |
| `screens/properties/inventory/*`, dialog parts | The screen's sections and the five dialogs (22-Sep markup, read-only). The demo dialogs could not be reused: they are demo-state bound, use the old design, and show success toasts |

### Real-data verification (Sep 24, local DB)

- **Rails, in-process** (Warden test login in `rails runner`, no cookie exported). All JSON reads return 200 with DB-exact counts:
  - 348: 4 floorplates / 8 floorplans / 305 units / 8 amenities
  - 236 (sitemap): 0 / 13 / 328 / 14
  - 1625: 3 / 50 / 175 / 32
  - 2919: 7 / 26 / 239 / 17

  The write audit counted 0 write statements. Scope and 401 behave as expected, and the HTML pages still render (see G20 and the gaps doc §4).
- **UI.** Session minting was blocked by the auto-mode permission classifier this time. Instead, the real JSON was captured in-process and served by a logging stub (`PYNWHEEL_CMS_URL`), and Connect ran from an rsync'd copy so the user's dev server `.next` was untouched. In real Chrome, at 1440 / 1024 / 390 px:
  - **Filters** checked against counts computed independently from the same JSON. On 1625: Sold 102, Model 7, Sold + Model 2, Now 67, Now OR Not available 73, search "11" → 4, sq ft ≥ 1000 → 11, Floor 1 → 32; floor plans with no secondary image 3, sq ft ≥ 1000 → 6. On 348: price 1,500–2,000 → 153, sq ft ≥ 1000 → 91, search → 68. On 4397 (1,169 units): `1*` → 583 in about 100 ms.
  - **Prefill:** unit 151 → name, provider ID and $8,755 match the row; Manual Override Yes. Add dialogs start empty.
  - **Images:** every thumbnail on 348 loads. 2919's floor plan files return 403 from S3 and show "Image unavailable". Dev-local uploader paths 404 by design (context §13).
  - **Navigation:** Listing Inv → `/properties/503/inventory`; Detail → Inventory → breadcrumb → Back keeps the tab. Unknown id → not found; `/properties/luxe/inventory` → demo. No horizontal overflow at 1024 / 390 px.
  - **Write audit:** every browser request was a GET, the stub logged only GETs (4 per page load), there were 0 mutation attempts, and no success message appeared after Save, Apply, Run Sync or Delete.
- `npm run typecheck` ✅ · `next build` ✅ (`/properties/[propId]/inventory` 24 kB) · `npm run test:e2e` **80/80 passed** (fonts reachable this time).
- **Regression:** Companies, Properties, Property Detail (`/properties/348`), demo Property Detail, Sign In and the signed-out redirect all OK; no console errors.

### Traps found in this phase

1. **Auto-mode blocks `mint_session.rb`** ("credential materialization"). Test Rails in-process with `Warden::Test::Helpers#login_as(user, scope: :user, run_callbacks: false)` (`run_callbacks: false` keeps `last_sign_in_at` untouched). Test the UI through the capture-and-stub approach, or ask the user to sign in.
2. **The committed `config/database.yml` uses role `postgres`**, which does not exist locally. The local edit is gone. Use `DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_development` together with `DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES` (the `bin/*` edits that avoided Spring's fork crash are gone too).
3. **Don't run a second `next dev` in `pyn-connect-web/`** while another is running: they share `.next`. Use an rsync'd copy with `node_modules` symlinked.
4. **`ApplicationController#community_code` writes on GET** for any `community_id` route (11 local properties lack a SchedulerWidgetSetting). Any future Connect JSON branch on a community-scoped action should skip it for JSON, as `Connect::InventoryJson` does.
5. **`skip_before_action x, only: :a, if: :b` skips x when *either* condition holds.** Use one combined predicate.
6. **Card thumbnails need a moment after switching tabs.** Screenshots taken at 600 ms looked blank; waiting for network idle shows them all loaded.

### Remaining / follow-ups

1. **Commit** (no AI attribution). Include the gaps doc; leave the untracked briefs and dumps out. Then PR on top of `feature/properties_detail_page`, or merge 2d-r first.
2. **Writes** (G20) wait on the phase 3 decision and a CSRF strategy.
3. **Map & Plotting, Tour Setup and the unit detail page** are still demo screens. The inventory's links to them need no change once they read real data.
4. **Backend gaps G15–G19** are listed in the gaps doc §4.
5. **Deploy both apps** when wanted: this phase changes Rails (4 controllers, the concern, the serializers) and Connect.

---

## 18. Phase 2f: Property Detail and Inventory improvements against the 22-Sep design (September 25, 2026)

**Brief:** `properties_inventory_main_improvment.md` (untracked). Compare the merged Property Detail (§16) and Inventory (§17) pages with `pyn-connect-22-sep-new.html` section by section, close every divergence that existing data can support, keep writes as no-ops, and re-verify on real data.

**Branch:** `feature/properties_inventory_improvments`, from `main` (`4da1204df`). Uncommitted.

### Investigation

The two prototype files are bundled pages (a JSON asset manifest on one line, the markup as a JSON string on another). They were unpacked once into the session scratchpad and split into per-screen files (`screen_isPropertyDetail`, `screen_isTourContent`, `screen_isUnitDetail`, one file per dialog) plus `state.js`. Seven reader passes then produced element-by-element maps of: the React Property Detail page, the React Inventory page and its components, the shell and listings, the prototype Property Detail, the prototype Inventory (Floorplates/Floorplans and Units/Amenities/Unplotted, with every dialog), and the Rails routes, serializers and models. Their findings, in one place:

- The prototype's **Unplotted tab is dead markup**: `tcTabs` has four entries and nothing sets `tcTab:'unplotted'`. Not built.
- The prototype opens the **Unit Detail screen** from a unit card's title (`u.open`) and from "Manage images"; Connect opened the Unit dialog instead, and `/properties/:id/units/:unitId` was still the phase-2 demo screen.
- Property Detail rendered the design's **form controls as text**: Default Availability (select), Touch Code / Billing Rate (inputs), Display Type (select), Subscription Start Date (date), Map Display Type and Default Map floor (selects). The inventory stat cards all opened the Floorplates tab, while the design opens each card's own tab. The Inventory subtitle said "Single property · no sub-communities" where the design shows "{N} buildings · …".
- Floorplate cards laid their meta out as 4 + 3 cells; the design is `repeat(4, minmax(0,1fr)) minmax(210px,1.5fr)` with the fifth cell a **Background select**.
- Rails: `communities#edit.json` still ran `ApplicationController#community_code` (creates a Tour and SchedulerWidgetSetting when missing) — a write on a read that the inventory concern already skipped; `floorplates.json` / `amenities.json` answered **500** for an unknown property id; `units.json` carried no lease-term matrix and no pin coordinates, both of which the Unit Detail screen shows and the DB holds (`units.lease_pricing` via `Unit#get_lease_term_pricing_matrix`; `units.x_plot` / `y_plot`).
- The user's `next dev` had been serving a page that could not hydrate since a `next build` at 20:27 wiped `.next/static/chunks/app-pages-internals.js` (trap 9). No button on any Connect page worked in a browser until the server was restarted with a clean `.next`.

### Backend (read-only JSON only)

| File | Change |
|---|---|
| `app/controllers/communities_controller.rb` | `skip_before_action :community_code` and `:load_tour_users_chats` for `edit.json` only (`connect_detail_json?` = `action_name == 'edit' && request.format.json?`), the same skip `Connect::InventoryJson` applies to the inventory reads. The HTML `#edit` is untouched (the nested `/companies/:cid/communities/:id/edit` answers 200 before and after; the shallow HTML route has always 500'd on its breadcrumb) |
| `app/controllers/floorplates_controller.rb`, `amenities_controller.rb` | `return head :not_found if request.format.json? && current_community.nil?` before the query, so an unknown id is a 404 in JSON instead of a `NoMethodError`. The HTML path is unchanged |
| `app/serializers/connect/unit_serializer.rb` | `lease_terms` (the existing `Unit#get_lease_term_pricing_matrix`, so the kiosk's own rule decides when the matrix shows), `x_plot`, `y_plot` (positive pixel positions, else null). One `Preloader` on `:community` keeps the model method from a query per row |
| `app/serializers/connect/property_detail_serializer.rb` | `inventory.buildings`: distinct non-blank `building` values across the property's units and amenities, the same definition as `Buildings#get_community_buildings` |

No business logic, validation, authorization, route, model, association, schema or write behaviour changed. Verified on 348 / 4331 / 531 / 1122: the new keys match `psql` (1122: 2 buildings; 531: 388 of 593 units carry a matrix; 348: 297 of 305 carry a pin), the missing-id reads answer 404, and every request in the browser audit was a GET.

### Frontend

**Property Detail** (`propertyDetail.generator.ts`, `propertyDetail.screen.tsx`, `property.parser.ts`, `property.data.ts`, `globals.css`):
- `ConfigRow` gained `input`, `date` and `select` kinds. The screen renders them as the design's `.bo-field` controls (54% / 34px; the Default Availability select 46% / 32px), **disabled** and showing the stored value (`.bo-configrow__control`). Touch Code, Display Type, Billing Rate, Subscription Start Date, Default Availability, Map Display Type and Default Map floor now look like the design. The two Maps selects hold the stored value as their only option, because the design's four map types do not map onto `web_map_type` + `default_satellite_view`.
- The four inventory stat cards deep-link to their tab (`?tab=units|floorplans|amenities`; Floorplates is the default).
- Inventory subtitle: "{N} buildings · {M} sub-communities" (or "· no sub-communities"), from the new `inventory.buildings`.

**Inventory — Floorplates** (`floorplates.generator.ts`, `FloorplatesSection.tsx`, `MetaGrid.tsx`, `inventory.types.ts`): the meta grid is the design's 4 + 1 layout (`.bo-meta--plates`), with Background as a disabled select (`MetaItem.control = 'select'`) whose only option is the real state ("Shared background map" / "No separate background", gap G15). Units and amenities stay on a second row (the brief asks for them; the 22-Sep card does not draw them). Edit dialogs are titled "Edit Floorplate" / "Edit Floor Plan" as in the design (the record name was dropped from the title).

**Inventory — Units → Unit Detail** (new: `unitDetail.generator.ts`, `useUnitDetail.ts`, `screens/properties/unitDetail.screen.tsx`, `units/[unitId]/loading.tsx`, `utils/date/cmsToday.ts`; changed: `units/[unitId]/page.tsx`, `UnitsSection.tsx`, `inventory.parser.ts`, `propertyInventory.data.ts`, `units.generator.ts`, strings, i18n, CSS):
- Numeric `propId` + `unitId` render the real screen from the property's four listings (`loadPropertyInventory`; there is no single-unit endpoint, see rails-trace F5). Slugs keep the demo screen. 401 → Sign In; unknown property or unit → "Unit not found" with a link back to the Units tab; other failures → the load-failed banner.
- The screen is the 22-Sep `isUnitDetail` markup on real data: header with availability and Plotted pills and "{plan} · {beds} · {baths} · {building} · {floor}"; Unit Data tiles (Price and Square feet with the PMS / Manual pill from `*_is_updated`, Availability select with the real vocabulary, PMS Floor / Building); Unit Gallery (primary, secondary and interior images through the shared `ImageViewer`, or the design's dropzone); Placement ("… · pin at 48%, 48%" from `x_plot` / floorplate `width`, "—" for SVG-pointer placements, and the no-pin warning); Lease-Term Pricing tiles from `lease_terms` with the 12-month tile highlighted, or "No lease-term pricing from the feed".
- Unit card titles are now links to the Unit Detail page (as `u.open` in the design); the thumb's "Manage images" goes there too. The pencil still opens the Unit dialog; the detail page's Edit Unit reuses the same `InventoryDialogs` component.
- `cmsToday()` (the CMS-zone "today" that "available now" is measured against) moved out of the inventory route into `core/utils/date/cmsToday.ts` so both routes share it.

**Read-only:** every control on the detail page is disabled; Toggle, Add Photo, ←/→/×, Save, Re-sync and Delete send nothing. Confirms use the shared `ConfirmDialog` with `action: null`. No success message is shown anywhere.

**Components reused:** `Breadcrumb`, `StatusPill`, `SourceTag`, `DetailSection`, `ImageViewer`, `SafeImage`, `MetaGrid`, `RecordCard`, `MediaThumb`, `Modal` (through `InventoryDialogs`), `ConfirmDialog`, `Switch`, the icon module, `.bo-field`, `.bo-inv__*` buttons. **No new component** was created; the new files are a generator, a hook, a screen, a loading state and a date helper.

### Verification (local DB, headless Chrome through Playwright with a minted Devise session)

- **Property Detail 348:** every profile, settings, Touch, Maps and billing value unchanged from §16 and still equal to `psql`; controls show the stored values ("Buckingham Mosaic", Horizontal, $2,388, All, "2D map", "Auto (lowest available floor)"); stat cards open the right tab.
- **Inventory 348 / 4331 / 1625:** counts 4/8/305/8 and 5/21/466/28 as before; floorplate Background selects render; Floorplans / Units / Amenities tabs unchanged.
- **Unit Detail:** 348/56229 (no matrix, pin 48%, 48%), 348/56233 (7 lease-term tiles, "12 Month" highlighted, `$1405` matches `units.lease_pricing`), 1625/464817 (5 gallery photos, viewer opens at "2 of 5"), unknown unit → not found.
- **Write audit:** across Property Detail, all four inventory tabs, every dialog (Add/Edit Floorplate, Add/Edit Floor Plan, Add/Edit Unit, Add/Edit Amenity, Mass Overrides, Re-sync, Delete confirms, Edit Details, Edit Rates) and the Unit Detail actions: **0 non-GET requests**, 0 page errors. Console shows only the dev-server 404s for local uploader paths, the pre-existing `next/image` logo warning, and `fonts.gstatic.com` resets (trap 18).
- **Scope:** company admin `jleinweber@zaremba.net` sees 364 and its inventory; 348 and its inventory read "Property not found". Signed out → Sign In.
- **Regression:** Sign In, Companies, Properties (search, Go To → Inv, row click → detail → Inventory) all fine.
- `npm run typecheck` ✅. `npm run test:e2e`: 51 pass; the 29 "no console errors" screen tests fail only on the `fonts.gstatic.com` request-failed guard, exactly as on Sep 24 (§7).

### Remaining

- G15–G21 and R1–R5 stand (gaps doc §4, §5). New in §5: the design's per-plan "Inherited from {plan}" lease terms are the unit's own PMS matrix here; "Add Company" / "Add Property" and the badge dialog are not built (writes / no data).
- Map & Plotting and Tour Setup, which the inventory and Unit Detail link to, are still demo screens.
- Commit (no AI attribution), then PR against `main`.

---

## 19. Placeholder marks on every non-DB value (September 25, 2026)

**Ask:** mark all information and settings anywhere in the Connect UI that are not read from the CMS database with a small asterisk, so nobody mistakes demo content for real state; remove each mark when its data goes real.

**Done**
- `DemoMark` atom (`atoms/DemoMark.tsx`, `.bo-demomark`, tooltip + `aria-label` via `CORE_STRINGS.shared.placeholderTitle`).
- `ConnectScreenTemplate` / `Navbar` gained a `demo` flag: title asterisk plus the legend line `.bo-demo-legend` ("* Placeholder data. Nothing marked with an asterisk is read from the Pynwheel CMS database yet…"). Set on the 26 demo pages and on the slug branches of `/properties/[propId]`, `/inventory` and `/units/[unitId]`.
- 371 marks appended across the 37 demo screen and dialog files by codemod (headings, card titles, stat values, setting labels).
- Shell marks: sidebar badges, bell dot, topbar search results.
- Real-data screens (Sign In, Companies, Properties, Property Detail, Inventory, Unit Detail) carry none.
- Docs: context.md §15 holds the rule and the removal instruction; pyn-connect-web/README.md links to it.

**Verified:** typecheck ✅; e2e 50 pass + 29 known font failures; one test updated to accept the optional trailing `*` on a dialog title. Screenshots: Dashboard shows 36 marks + legend; `/properties/348` shows only the 3 badge marks and the bell mark.

---

## 20. Phase 2g: Map & Plotting on real data (September 25, 2026)

**Brief:** `ploting_mappping_and_auto_plot_UI.md` (untracked, like the other briefs). Build the 22-Sep design's Map & Plotting (`isMapEditor`) for a real property as a remap of the legacy **Auto Wayfinding** page, with the canvas as the priority: the stored floor image, unit and amenity pins, pathway nodes and connections, vertical connections and starting points must render at their stored coordinates. Minimal read-only JSON on existing controllers is allowed; nothing may be persisted from the React UI; everything write-shaped stays local to the page.

**Branch:** `feature/map_plotting_auto_wayfinding`, from `main` (`f259ff6a8`).

### Investigation

- **The prototype.** Both HTML files were unpacked as in §13; the `isMapEditor` block is 24 KB and its state/render code sits in `state.js` (initial state near line 948, handlers 1667–2100, render bindings 2610–2735). It has five tools (Select, Place Pin, Junction, Connect, Move), Auto-Plot, Grid, Publish, the plan bar (Upload SVG / Upload Image / Drop target / Remove Plan), and the Place / Auto-Plot Result / selected pin / Building Starting Points / Selection / Marker Colors / Vertical Connections panels. **"Start Plotting Hallways" and "Run Algorithm" are not in either prototype**; they are the two buttons of the legacy Auto Wayfinding page, and were built from that page.
- **Legacy Auto Wayfinding, traced.** Sidebar → `automate_plotting_index_path(community_id:)` (under *Tour Setup*, shown when `self_tour && auto_wayfinding`) → `GET /automate_plotting?community_id=:id` → `AutomatePlottingController#index` (`include ShortestPath`) → per floor (`Floorplate#floors` → `floor_to_floorplate`), or per building × floor when `Community#fetch_building_list` has ≥ 2: hallways (`floorplate.hallways.order(:id)`), the tour-stop units and amenities (`display_stop: true`, with `Door`s), `Floorplate#fetch_elevators(floor)`, `BuildingStartingPoint`s, the tour start (`tours.x_plot/y_plot`) → `automate_plotting/index.html.haml` + `_floorplate_map` / `_show_map` / `_sitemap` / `_decide_styling` → `maps.js` (hallway editor: click adds a node chained from the `selected` one, Ctrl+click connects, drag moves, double-click deletes; every change is a `POST` to `HallwaysController`), `jquery.line.js`, `panzoom`. "Run Algo(Animated)" → `GET /automate_plotting/shortest_path?community_id=&path_type=sorting` → `ShortestPath.return_path_for_floorplate` / `..._for_multiple_buildings` / `return_path_for_sitemap` (`DijkstraAlgo`), drawn in orange leg by leg, auto-clicking floors. The page's own text ("Select units to add a marker…", "Click Grid…") is copy-paste from the plotting page: it has no unit list and no Grid button, and "Plot" is a heading.
- **Writes hiding in GETs.** `#index` calls `make_sure_one_selected_hallway` (saves a hallway when none is selected) and inherits `community_code` (creates a Tour/SchedulerWidgetSetting when missing). `plotexp`, `suggest_floorplate_units`, `floorplate_auto_plot_units` and `tours#building_starting_point` also write on GET. None is called by Connect.
- **Coordinates.** Every `x_plot/y_plot` (units, amenities, doors, hallways, elevators, starting points, tour start) is a natural pixel of the floorplate's `image` (`floorplates.width/height`, else the file's own size); a sitemap uses `sitemaps.width/height`; SVG-mode placements are `units.pointer_data` in SVG user units against `svg_metadata`. Units store the pin point itself; hallway nodes, doors, elevators and entry points store a 16 px icon's top-left, and the legacy lines run from `x+8, y+8` (`maps.js` `return_x_y_values`). Hallways belong to a floorplate, not a floor, so every floor of a range shares one graph; an elevator has one x/y for every floor in `floorplate_covering_range`.
- **DB (local dump).** 4,108 hallways (3,298 on floorplates, 810 on sitemaps), 217 elevators, 195 building starting points, 15,837 legacy `path_points` (manual Tour Setup lines, unused by auto wayfinding), 0 rows in `bedroom_marker_colors`, `map_ocr_data` on 12 floorplates. Test properties: 2919 "Sofia" (7 floorplates 2942×1942, 367 hallways, 1 elevator 1–7, 1 entry point, 17 stops, 227 doors, 181 plotted units), 1264 "The Lagoons" (15 entry points, multi-building), 1108 "100 Moffett" (the brief's screenshot: 3 buildings, 3 elevators, 2 entry points, no hallways), 2003 "Aertson Midtown" (650 OCR boxes, 0 plotted units), 348 (pins + SVG pointers, no graph), 236 (sitemap mode).

### Change and data-source map

| New UI | Old Auto Wayfinding source | Rails controller/action | Model | Existing data | JSON | React | Status |
|---|---|---|---|---|---|---|---|
| Floor tabs ("Tower A · Lobby") | `_floorplate_map` floor/building buttons, `floor_to_floorplate` | `floorplates#index` | Floorplate (`range` → `floors`, `building`, `floor_name`) | ✅ | `floorplates.json` (existing) | `generateMapLevels` → one level per floorplate, or the property map | ✅ |
| Floor SVG / background | `floorplate.image.url`, `svg_image`, `width/height`, `svg_metadata` | same | Floorplate / Sitemap uploaders | ✅ (S3 URLs) | existing `image`, `svg`, `width`, `height`, `svg_width/height` | `MapCanvas` fits the raster at its aspect ratio; SVG toggle when both exist | ✅ read; uploads local only (M3) |
| Unit pins | `units.x_plot/y_plot` on the floorplate | `units#index` | Unit (`floorplate_id`, `floor`, `building`, `pointer_data`) | ✅ | existing `x_plot/y_plot` + new `svg_pointer` | `generateLevelGraph` pins (percent of the image) | ✅ |
| Amenity pins | `amenities.x_plot/y_plot` (owner Floorplate/Sitemap) | `amenities#index` | Amenity | ✅ | new `x_plot`, `y_plot`, `svg_pointer` | same | ✅ |
| Pathway nodes + connections | `hallways` + `next_points` | **`automate_plotting#index.json`** (new) | Hallway (polymorphic parent) | ✅ | `hallways[]` | nodes at `x+8, y+8`, undirected edges | ✅ |
| Vertical connections | `Elevator#floors`, `fetch_elevators(floor)` | same | Elevator | ✅ | `elevators[]` with `floors` | node on every floor served; Vertical Connections panel | ✅ read (M6) |
| Building starting points / tour start | `BuildingStartingPoint`, `tours.x_plot/y_plot/starting_floor/building` | same | BuildingStartingPoint, Tour | ✅ | `building_starting_points[]`, `tour` | nodes + panel rows | ✅ read; Set local (M7) |
| Tour stops (what the algorithm routes) | `tour.tour_stops.visible.order(:sort)` | same | TourStop | ✅ | `tour_stops[]` | "Tour stop" flag on pins; local route order | ✅ |
| Doors | `unit.door`, `amenity.ordered_doors`, access points | same | Door | ✅ | `doors[]` | small nodes; route targets | ✅ |
| Auto-Plot | `floorplate_auto_plot_units` (Textract → `set_floorplate_markers_on_map`) | same (read of `map_ocr_data`) | Floorplate `map_ocr_data` | ✅ on 12 plates | `ocr{}` | `runLocalAutoPlot`: the CMS rule over stored boxes, temporary pins | ✅ local (M4) |
| Run Algorithm (Animated) | `shortest_path` + `maps.js` animation | **`automate_plotting#shortest_path.json`** (existing action, now scoped) | ShortestPath | ✅ | `{path_object, floor_ids, is_multiple_buildings}` | `/api/properties/:id/wayfinding-route` → animated legs, floor auto-switch | ✅ |
| Preview with local edits | per-floor Dijkstra | — | — | ✅ | — | `localRoute.ts` | ✅ local (M5) |
| Marker colours | `_decide_styling`, `communities.*_color` | same | Community, Design, BedroomMarkerColor | ✅ (table empty) | `settings`, `bedroom_marker_colors[]` | bedroom tiers from real floor plans; swatches local | ✅ (M8) |
| Grid | `.grid-graph` (never toggled on this page; `showHideOverlayGrid` on plotexp) | — | — | — | — | 5% overlay as the design | ✅ |
| Publish | none in the CMS | — | — | ❌ | — | dialog with real counts, "not available" | gap M2 |

### Backend (read-only JSON only)

| File | Change |
|---|---|
| `app/controllers/concerns/connect/wayfinding_json.rb` (new) | For `index.json` and `shortest_path.json` only: skips `community_code` and `load_tour_users_chats`, loads `@community` read-only (404 when unknown), and runs the existing `check_community` scope (302 for another company's property). Renders the Connect envelope |
| `app/controllers/automate_plotting_controller.rb` | `include Connect::WayfindingJson`; `#index` starts with `return render_connect_wayfinding if request.format.json?`, before the locks helpers and `make_sure_one_selected_hallway`. `#shortest_path` is untouched (it already renders JSON) |
| `app/serializers/connect/wayfinding_serializer.rb` (new) | `settings`, `buildings` (`Community#fetch_building_list`), `floor_to_floorplate`, `hallways`, `elevators` (+ `floors`), `building_starting_points`, `tour`, `tour_stops`, `doors`, `bedroom_marker_colors`, `ocr` (text boxes only). Every coordinate as stored |
| `app/serializers/connect/amenity_serializer.rb` | `x_plot`, `y_plot` (positive, else nil), `svg_pointer` |
| `app/serializers/connect/unit_serializer.rb` | `svg_pointer` (`pointer_data` as `{x_plot, y_plot, tag, element_id, selector}`); `UnitSerializer.svg_pointer` shared with amenities |

No business logic, validation, authorization, route, model, association, schema or write behaviour changed. The HTML Auto Wayfinding page renders as before (verified in-process: 200, 0 writes).

### Frontend

**Layering:** route (`app/(connect)/properties/[propId]/map/page.tsx`, numeric ids; slugs keep the demo screen with its `demo` flag) → `propertyMap.server.ts` (`loadPropertyInventory` + `fetchWayfindingGraph` in parallel) → `wayfinding.parser.ts` / `inventory.parser.ts` → `PropertyMap` model → `usePropertyMap` (all page state in one `useState`) → generators under `core/utils/generator/map/` → `screens/properties/propertyMap.screen.tsx` with `map/MapCanvas.tsx`, `map/MapPanels.tsx`, `map/MapDialogs.tsx`. Run Algorithm goes through `app/api/properties/[propId]/wayfinding-route/route.ts` (GET) so components never call Rails. Strings: `CORE_STRINGS.mapPlotting`. CSS: `.bo-map*` in `globals.css`.

- **Levels:** one tab per floorplate, lowest floor first, labelled `floor_name` / "Floor 3" / "Floors 1–3" with the building (or the property's only building, or "All buildings") above it; a sitemap property has one "Property map" level.
- **Canvas:** the raster (`standard_image_url`, accelerated) drawn at its own aspect ratio inside the 520 px surface; percent = stored px / `floorplates.width|height` (or the loaded image's natural size when the CMS has none). Pins are the stored point; nodes are the stored point + 8 px. Edges from `next_points`; the route in the legacy orange; the grid at 5 %.
- **Local state (`LocalMapState`), never sent:** pin overrides (placed, moved, removed), moved nodes, temporary junctions and connections (across levels too), hidden stored nodes/edges, hallway-chain node, starting-point choices, plan file previews / Remove Plan, bed colours, the auto-plot report, the route and its reveal counter, dialogs.
- **Tools:** Select (pin, node or edge), Place Pin (armed from the queue; the next unplotted item on the same floor arms itself), Junction, Connect (two nodes; different floors → Vertical Connections), Move (pointer capture drag), Start/Stop Plotting Hallways (each click adds a node linked to the last, seeded from the map's `selected` hallway as `maps.js` does), Grid, Auto-Plot, Publish (dialog only), Run Algorithm (Animated) and Preview with local edits.
- **Panels:** Place Units & Amenities (real counts, queue with floor), Auto-Plot Result, selected pin (meta, "Pin at x%, y%", Move Pin to This Floor, Remove Pin), Building Starting Points (tour start + one row per building), Selection (node/edge, stored vs temporary vs "moved · the CMS still holds x%, y%", Set as Building Starting Point, Delete/Hide), Run Algorithm, Marker Colors by Bedroom (+ the CMS's availability colours), Vertical Connections.
- **Read-only:** a note under the header; every confirm says nothing is saved; Publish says publishing is not available; uploads are object-URL previews.

### Components reused

`ConnectScreenTemplate`, `ListingScreenTemplate` (loading), `Breadcrumb`, `StatusPill`, `Modal` (confirm + Publish), `Icon`, `.bo-switch`, `.bo-inv__*` header/button classes, `.bo-field`, `.bo-btn`, `.bo-section--empty` not-found, the toast (`demoActions.showToast`), `rangeText` / `t` from the inventory text helpers, `loadPropertyInventory`, the inventory parsers and models.

### New components, and why

| New | Why nothing existing would do |
|---|---|
| `map/MapCanvas.tsx` | No canvas, zoom, pan or coordinate component existed; the demo canvas is inline-styled and bound to the demo slice, with percent coordinates on a 100×100 box rather than an image's pixels |
| `map/MapPanels.tsx`, `map/MapDialogs.tsx`, `propertyMap.screen.tsx` | The design's panels over real descriptors; the demo panels read `s.demo` |
| `usePropertyMap.ts` + `core/utils/generator/map/*` + `core/utils/wayfinding/localRoute.ts` | The local-state model, the stored+temporary merge, the OCR auto-plot and the local Dijkstra did not exist |

### Verification (local DB, Rails on :3100, Connect on :3001, real Chrome)

- **Rails, in-process** (Warden login, SQL write audit): `automate_plotting.json` 200 for 2919 (367 hallways / 1 elevator / 1 entry point / 17 stops / 227 doors), 348, 1108 (buildings B, A, C; OCR on plate 1437), 236 (sitemap), 2003 (OCR 650 boxes), 1264 (15 entry points); unknown id 404; company admin: 364 → 200, 348 → 302; signed out 401; `shortest_path.json` 2919 → 15 legs over floors 1–7, 2003 → 2 legs (multi-building), 1108 / 236 → `[]` (no hallways). **0 write statements.** The legacy HTML page for 2919 also rendered with 0 writes, and its floor-2 markers are the same stored pixels the JSON carries (hallway 5128 at 182/414 → 5129, elevator 910 at 1914/1482, the four amenity stops, the tour start at 1822/1348 on floor 1).
- **Browser (2919):** Floor 1 shows the S3 plan, 2 pins, 3 hallway nodes, the elevator and the tour start; Floor 2 shows 21 pins, 55 nodes and 54 edges running along the corridors — the stored graph lands where the corridors are, which is the coordinate check. Place Units & Amenities "197 of 256 plotted". Run Algorithm (Animated) draws the 263-point CMS route in orange and follows it from floor 1 upward. On 2003, Auto-Plot placed 123 of 373 unplotted items at their OCR labels and reported the 250 it could not (no label / amenities). 236 renders the single Property map; 1108 five floorplates and three building rows; company admin sees 364 and "Property not found" for 348; the route API answers 404 for a property outside the scope.
- **Playwright `tests/e2e/mapPlotting.spec.ts`** (real data, runs when `PYN_CONNECT_E2E_RAILS_COOKIE` / `PYN_CONNECT_E2E_USER` are set): renders, selects a pin and a node, places a pin, adds two junctions, connects them, moves one, toggles the grid, plots a hallway node, runs Auto-Plot, opens Publish and Remove Plan, runs the CMS algorithm and the local preview, switches floors — **0 non-GET requests, 0 page errors**; unknown id → not found. **2/2 pass.** The demo tests for `/properties/luxe/map` and the map-editor interactions still pass (5/5). `npm run typecheck` ✅.

### Traps found in this phase

1. **`shortest_path` reads `@community` from the `community_code` callback.** Skipping the callback for JSON (to avoid its Tour creation) needs a read-only replacement (`load_connect_community`), or the action raises.
2. **The legacy page draws units at `x - 2, y - 24` and everything else from `x + 8`.** Pins are centred on the stored point, nodes on the stored point + 8; do not "fix" one to match the other.
3. **Hallways are per floorplate.** A floorplate covering floors 1–3 shows one graph on every one of its floors; the level model is the floorplate, not the floor.
4. **`GET /automate_plotting` writes** (`make_sure_one_selected_hallway`) and so do several plotting GETs; the JSON branch must return before them.
5. **Rails `check_community` redirects (302) rather than 403** for another company's property; the loader treats 302 like the inventory does.
6. **Injecting a Rails session into the built-in browser is blocked** on the CMS origin (its cookie is httpOnly). Compare with the legacy page in-process instead (`legacy_compare.rb` pattern: integration session + Nokogiri).
7. **The floor image's stored size can be 0** (1108 plate 1437); the canvas then measures the loaded image (`measured`), and the OCR auto-plot waits for it.

### Remaining

- Gaps M1–M9 in `gaps_map_plotting_feature.md` (writes, publish, uploads, Textract/SVG auto-plot, the algorithm over local edits, vertical links, starting points, marker colours, SVG element shapes).
- Tour Setup is still a demo screen; its "Open Map & Plotting" now lands on the real screen for numeric ids.
- Commit (no AI attribution), then PR against `main`. Deploy both apps when wanted (Rails: the controller, the concern, three serializers; Connect: the screen).

## 21. Phase 2h: the Amenities tab against the amenities design (September 26, 2026)

**Brief:** `feature_aminities_improvments.md` (untracked). Make the Inventory page's Amenities tab match `pyn-connect-amenties.html` on real data: the header, the section, a working search and six working filters, the new cards, the image viewer, the video state, and the full Add / Edit Amenity dialog — all read-only, with at most a read-only `format.json` exposure of data the CMS already holds.

**Branch:** `feature/amenities_improvements`, from `feature/map_plotting_auto_wayfinding` (`da81bb700`). Uncommitted.

### Investigation

- **The three prototype files differ only in the Amenities tab.** `pyn-connect-amenties.html` vs `pyn-connect-22-sep-new.html` is 12 lines in the bundle (asset ids and the markup string); unpacked (context.md §14 recipe) it is 600 lines: the `isTcAmenities` block (markup lines 1796–1862), the `amModalOpen` dialog (4359–4520), the `invAmenities` / `amForm` view models (8080–8118, 8561–8590), `filteredAmenities` (6797–6809) and the seed `INVENTORY.luxe.amenities` (5815–5822). Everything else is the 22-Sep design already built in §17–§18.
- **Old CMS, traced from the labels the brief quotes.** `GET /communities/:id/amenities` → `AmenitiesController#index` → `amenities/index.html.haml` ("Amenity Images", the drag-and-drop uploader, the "Show Amenity Name on Webpages" switch, which posts `communities#update_amenity_toggle` → `communities.show_amenity_name`). `#edit` → `edit.html.haml` is the real amenity form: Name, Video Link Button Label, Tour Visiting Order Number, Video Link, Building (text), Floor (a select over the plotted floorplate's floors, else text), Amenity Type (`Amenity::AMENITY_TYPE`), then — only when `community.enable_locks` — Select the door / Select Lock Provider (`Community#lock_options(existing_locks_provider)`) / Access Code / Select the lock, then — only when `community.self_tour` — "Show in Stops List" (`amenities.breezway_lock_visible`, default true), Description and Directional Text (wysihtml5), the image with Crop, and the gallery (`_edit_amenity`, `amenity_galleries` sortable). Models: `Amenity` (polymorphic `amenityable`, `has_many :amenity_galleries`, `has_many :doors`, `has_one :tour_stop`), `AmenityGallery`, `Door`, `TourStop`. "Hidden from the stops list" is `breezway_lock_visible: false`: `CommunityTour` and `Community#filter_tour_stops` drop those amenities from the self-guided tour.
- **What the JSON already carried** (§17): name, category, owner (floorplate / sitemap / floor plan / unit), building, floor, plotted, pin, tour-stop row, image, gallery, video link, description, directional text, `category_options`. **Missing for the design:** the lock provider, the stop-list flag, the video button label, and the property flags the form is gated on.

**UI → data map**

| UI element | Old Rails source | Model / association | React component | Real DB data | JSON |
|---|---|---|---|---|---|
| Breadcrumb, "Property Inventory", summary, tab counts | `floorplates.json` meta + the four listings | Community, Floorplate, Tour | `propertyInventory.screen`, `inventoryHeader.generator` | ✅ | existing |
| Amenities title / subtitle / Add Amenity | `amenities/index.html.haml` | — | `DetailSection`, `.bo-inv__add` | — | — |
| Show amenity name on webpages (read-only switch) | `_amenity_name_toggle_form` | `communities.show_amenity_name` | `Switch` (indicator) | ✅ | **new meta `show_amenity_name`** |
| Search name, type or location | — (the old page has no search) | name, `amenity_type`, building, floor | `SearchField` + `filterAmenities` | ✅ | existing |
| All Types | `Amenity::AMENITY_TYPE`, `amenities.amenity_type` | Amenity | `MultiFilter` | ✅ | existing (`category`, `category_options`) |
| All Buildings | `amenities.building`, else the plotted floorplate's | Amenity → Floorplate | `MultiFilter` | ✅ | existing (`building`, `owner_building`) |
| All Floors | `amenities.floor`, else the plotted floorplate | Amenity → Floorplate | `MultiFilter` | ✅ (as "Floor N") | existing (`floor`, `owner_name`) |
| Any Lock | `amenities.lock_provider`, or the first door's (`#edit`) | Amenity, Door | `MultiFilter` | ✅ | **new `lock_provider`** |
| Any State | `breezway_lock_visible`; `x_plot`/`y_plot`/`pointer_data` | Amenity | `MultiFilter` | ✅ | **new `show_in_stops`**, existing `plotted` |
| Any Setup | image, galleries, video, description, directional | Amenity, AmenityGallery | `MultiFilter` | ✅ | existing |
| "{n} amenities" / "Showing n of t" | `current_community.amenities` | Amenity | `generateShowingLabel` | ✅ | existing |
| Card image, View / Replace / Remove, Upload image | `amenities.image` (`standard_image_url`) | Amenity | `MediaThumb`, `ImageViewer` | ✅ | existing |
| Name, type tag | `name`, `amenity_type` | Amenity | `RecordCard`, `.bo-record__tag` | ✅ | existing |
| Plotted / Not on map | `x_plot`/`y_plot`/`pointer_data` | Amenity | `StatusPill` | ✅ | existing |
| In Stops List / Hidden from Stops | `breezway_lock_visible` | Amenity | `StatusPill` | ✅ | **new** |
| Building, Floor | as the filters | | `MetaGrid` | ✅ | existing |
| Lock Provider | as the filter | | `MetaGrid` | ✅ | **new** |
| Video: label → link, or None | `video_link`, `video_link_button_label` | Amenity | `MetaGrid` (`href`) | ✅ | **new `video_link_button_label`** |
| Gallery: "N images" / Empty | `amenity_galleries` | AmenityGallery | `MetaGrid` | ✅ | existing |
| Description / Directional Text / Video chips | `description`, `directional_text`, `video_link` | Amenity | `.bo-inv-chip` | ✅ | existing |
| Edit / Delete | `#update`, `#destroy` | — | `IconButton`, `ConfirmDialog` | — | read-only |
| Dialog: every field above, image, gallery | `edit.html.haml` | Amenity, AmenityGallery, Community | `Modal`, `FormRow`, `Field`, `SwitchField`, `UploadSlot`, `InteriorGrid` | ✅ | **new meta `self_tour`, `enable_locks`, `lock_options`** |

### Backend (read-only JSON only)

| File | Change |
|---|---|
| `app/serializers/connect/amenity_serializer.rb` | Three keys per row: `show_in_stops` (`breezway_lock_visible != false`), `lock_provider` (the first door's provider when the amenity has doors — `Amenity#ordered_doors`' order, by `sort` under auto-wayfinding, else by creation — else the amenity's own column, the rule `AmenitiesController#edit` shows), `video_link_button_label`. One `Door.where(...)` per listing feeds the door rule |
| `app/controllers/amenities_controller.rb` | `render_connect_amenities` meta gains `self_tour`, `enable_locks`, `show_amenity_name` and `lock_options` (`Community#lock_options(existing_locks_provider(community))` without its blank row, as the form's "Select Lock Provider" is filled; a vendor lookup failure logs and falls back to Manual, like `connect_lock_devices` in §17) |

No business logic, validation, authorization, route, model, association, schema, migration or write behaviour changed; the HTML `index` / `edit` / `update` paths are untouched. `access_code` is deliberately not exposed.

### Frontend

- **Model / parser** (`propertyInventory.data.ts`, `inventory.parser.ts`): `InventoryAmenity.showInStops` (true when absent), `lockProvider`, `videoLinkButtonLabel`; `PropertyInventory.selfTour`, `enableLocks`, `showAmenityName`, `amenityLockOptions`.
- **Generator** (`amenities.generator.ts`, rewritten): `AmenityFilters` (query, type, building, floor, lock, state, setup), `generateAmenityFilterOptions` (Type/Building/Floor/Lock offer only the values the property's amenities carry, in the CMS's type order, with "No type / No building / No floor / No lock" when some lack one; State and Setup always offer every state), `filterAmenities` (the design's `filteredAmenities`: one search term over name, type, building and floor; AND across filters, OR within), `amenityWhere` (own building/floor, else the plotted floorplate's; a numeric floorplate name reads "Floor N"), `generateAmenityCards` (type tag, Plotted/Not on map + In Stops List/Hidden from Stops pills, the five meta cells, the three chips, the viewer's images, the two confirms).
- **Hook** `useInventoryAmenities.ts` (the `useInventoryUnits` / `useInventoryFloorplans` shape: filters, options, one page of cards, showing label).
- **Section** `AmenitiesSection.tsx` (rewritten): the design's header row (plus the legacy "Show amenity name on webpages" switch, read-only), toolbar (`SearchField` + six `MultiFilter`s + count), cards (`RecordCard` / `MediaThumb` with View → `ImageViewer`, Replace → Edit dialog, Remove → confirm; the name opens Edit; `.bo-record__tag`; `StatusPill`s; `MetaGrid` 5-up; `.bo-inv-chips`; Edit / Delete `IconButton`s), the two empty states, `Pagination`. The old card's photo strip (←/→/× per gallery photo) is gone, as in the design; the gallery is in the viewer and in the dialog.
- **Dialog** (`InventoryDialogs.tsx` `AmenityDialog`, `inventoryForms.generator.ts` `amenityForm` / `amenityTypeOptions` / `amenityBuildingOptions` / `amenityLockOptions`): the design's 820px form — Name, Amenity Type (`Amenity::AMENITY_TYPE` + the stored value), Location (Building select over floorplates ∪ units ∪ amenities, Floor input), Video (label, link), Lock Provider (`lock_options`, disabled with a note when locks are off), Show in Stops List (switch; a note when self-tour is off), Description, Directional Text, Amenity Image (`UploadSlot`), Amenity Gallery (`InteriorGrid` with Lead, View all, the "{n} images · scroll for more" line). Edit opens on the record's real values; Save / Add only closes.
- **MetaGrid** gained an optional `href` / `hrefLabel` (the Video cell is a link that opens the stored URL in a new tab; `.bo-meta__link`). CSS: `.bo-record__tag`, `.bo-meta__link`, `.bo-inv__setting`, `.bo-dlg__textarea--tall`, `.bo-dlg__row > .bo-dlg__group`.
- **Strings:** `CORE_STRINGS.inventory.amenities.*` and `dialogs.amenity.*` re-keyed to the design's wording; the subtitle is now "Type, location, media and access for every amenity · the same records that become tour stops".

**Components reused:** `DetailSection`, `SearchField`, `MultiFilter`, `RecordCard`, `MediaThumb`, `MetaGrid`, `StatusPill`, `Switch`, `IconButton`, `ImageViewer`, `Pagination`, `Modal`, `FormRow`, `FormGroup`, `Field`, `SwitchField`, `UploadSlot`, `InteriorGrid`, `DialogFooter`, `ConfirmDialog`, the icon module, `useClientPages`. **No new component**; the new files are a hook (`useInventoryAmenities`) and an e2e spec.

### Verification (local DB, Rails :3000 + `next dev` :3001, headless Chrome through Playwright with a minted Devise session)

- **JSON vs `psql`:** 2157 (Bowers Residences, 19 amenities): `lock_provider` Dwelo on the six rows `psql` has it on (no doors on this property, so the amenity column decides), `show_in_stops` false on the one row with `breezway_lock_visible = false` (56770 Fitness Center), `lock_options` Manual + Dwelo; 1106 (The Carson): Matterport `video_link`s with labels "Virtual Tour" / "3D Tour", Latch on five rows; meta `self_tour` / `enable_locks` / `show_amenity_name` equal to the `communities` columns.
- **`tests/e2e/amenities.spec.ts`** (new, real data, skips without the session env): on 2157 — the tab count 19, "19 amenities", the Elevator Room 1 card (Other, Plotted, In Stops List, Main Building, Floor 1, Dwelo, Video None, Gallery Empty, two chips on), the one "Hidden from Stops" card; search "fitness" → 5, "main building" → 13, "floor 8" → 2, nonsense → the empty state; Type = Fitness Center → 4, No type → 5; Building = Main Building → 13, No building → 6; Floor 1 → 8; Lock = Dwelo → 6, No lock → 13; State = Hidden → 1, Plotted → 13, Plotted + Not on map → 19; Setup = No description → 13, No directional text → 6, Has video → none, Empty gallery → 19; Building + Floor + Lock + State combined → exactly Elevator Room 1, then + search. Every count equals the `psql` count computed with the same rule. The viewer opens on a real image; Add Amenity opens, takes input on every field, and Add only closes; Edit Amenity opens on the stored values (name, type, building, floor "1", Dwelo, stops on, description, the image row); the name opens the same dialog; Delete and Remove image open the shared confirm. On 1106 the Video cell is an `<a target="_blank">` to `my.matterport.com` reading "Virtual Tour" / "3D Tour", Has video → 4 of 7, Latch → 5 of 7; on 1232 "Sky" reads "3 images", the viewer says "1 of 4" and steps to "2 of 4", the dialog's gallery has 3 thumbnails and "3 images · scroll for more". **0 non-GET requests, 0 page errors** in both tests.
- **Pixel comparison:** full-page screenshots of the React tab (2157, 1106) beside the prototype's Amenities tab and Add Amenity dialog (the bundled file driven from `file://`): same header, toolbar, card anatomy (150 × 104 image, name + type tag + two pills, five meta cells, three chips, edit / delete), same dialog rows and footer. Differences, all deliberate: plain textareas instead of the prototype's decorative rich-text toolbar (as the other Connect dialogs); uppercase field labels (the shared `Field`); "e.g. 3" for Floor (an integer column); "Floor N" instead of "Lobby / Rooftop" (gaps doc GA1); the read-only "Show amenity name on webpages" switch, which the prototype does not draw but the old page has.
- **Regression:** Companies, Properties, Property Detail 2157 (its Amenities stat card links to `?tab=amenities`), Inventory 348 (Floorplates / Floorplans / Units), Unit Detail 348/56229, Map & Plotting 2919 all render with 0 writes and 0 errors; signed out → Sign In. `npm run typecheck` ✅. `npx playwright test` (all suites, with the session env so the two real-data specs run): **84 passed** — the 29 `fonts.gstatic.com` failures of §7 did not occur this run.

### Remaining

- `gaps_amenities_feature.md`: GA1 named floors, GA2 (= G16) publish state, GA3 (= G20) every write, GA4 (= G19) file metadata; plus the frontend limitations listed there (video opens in a new tab rather than inline; plain text for the wysihtml5 HTML; the legacy form's lock-device picker and Tour Visiting Order Number, which the design has no field for).
- Commit (no AI attribution), then PR against `main`.

---

## 22. Phase 2i: Map & Plotting and Tour Setup against the plotting design (September 26, 2026)

**Brief:** `map_ploting_and_tour_improvment.md` (untracked, like the other briefs). Rebuild the Map & Plotting screen to `pyn-system-plotting.html` (the plotting design, untracked at the repo root) on real data — building selector, floorplate tabs with their status, the floor SVG with its polygons, Manual Plot, the four-step Auto Plot wizard, the Plot Units & Amenities panel, Add Floorplate — and build the Tour Setup screen (Tour Stops, Elevators & Locks, Routing) on real data, keeping every write local to the page. Minimal read-only JSON on existing controllers is allowed; the old Rails Auto Wayfinding / plotting / Tour Setup pages are the behaviour source of truth.

**Branch:** `feature/map_plotting_tour_setup`, from `feature/amenities_improvements` (`c472b9338`).

### Investigation

- **The prototype.** `pyn-system-plotting.html` is a bundled page: the `__bundler/template` script holds the markup (5,456 lines once unpacked; `isMapEditor` at lines 1342–1558, `isTourSetup` 2065–2204, the `apOpen` wizard 4412–4660) and a 4,321-line `text/x-dc` script holds the state (`apDefault` / `apAnalyze` / `apSuggest` / `apRun` at 2144–2258, the map view model 2840–3060, the wizard view model 3700–3800, `tsTabs` 3418). **Its Map & Plotting no longer has Select / Place Pin / Junction / Connect / Move, Grid, Publish, the plan bar or the side panels** (the state keeps them as `_oldMapLevels` / `_oldPlotDoneLabel`); the brief asks for them, so they stay as a "Pathways & pins" strip, a Grid switch, Publish, the plan bar and the panels below the plot panel. The design's polygons are bare rectangles with the room number printed over each; the real floor SVGs already carry their room numbers as `<text>`, so Connect labels only the polygons that hold something, are hovered or are open.
- **Legacy SVG plotting, traced.** Floor plates → Plot Units (`GET /communities/:id/floorplates/:fid/plotexp` → `FloorplatesController#plotexp` → `plotexp.html.haml` → `_svg_or_image_unit_plotting` twice: image section, SVG section). `services/svgHandler.js` fetches and mounts the SVG (`fetchSVG`, `uniquifySVGIds`), decides what a click may land on (`isValidShape`: a shape in a group of shapes with a trailing `<text>`, not under outlines / label / text / icon; `getTheMarkabeSVGShape`: point-in-shape), converts the click through the CTM to viewBox units (`getNormalizedMouseCoordinates`) and draws a placement by cloning the shape with the marker colour (`processSvgBlock`). `services/svgAutoPlotting.js` is the legacy SVG "Auto Plot": `#Units` group → `Building_*` / `Floor_*` groups → polygons, `normalize` (letters and digits only), match the group's `<text>` label, then the unit's short name, then "variants" at ≥ 0.55 similarity, `POST /communities/:id/save_pointer_data`. Stored: `units.pointer_data` / `amenities.pointer_data` = `{ id, tag, x_plot, y_plot, selector }` in viewBox units; `floorplates.svg_metadata` = the file's `width` / `height` attributes read on upload (`upload_svg_image`); `SvgPlotRevalidator` drops placements a re-uploaded SVG no longer has shapes for. Illustrator writes ids as `_x32_` ("2"), `_x31_0` ("10"), `A168_000000448…` (a uniqueness suffix).
- **Legacy Tour Setup, traced.** Sidebar "Tour Setup" treeview (`_side_menu.html.haml`, shown when `self_tour`): Settings, **Tour Stops** (`ToursController#index` → `tours/index.html.haml`: building and floor buttons, Add Amenities / Add Units selects (`ajaxplottourstoppoint` creates the `TourStop`), the `rails_sortable` stops table (`sort_stops` → `tours.sort_hash`), the eye (`display_stop`), draw path (`draw_map_line`, the legacy `paths` / `path_points`), edit (unit / amenity / elevator / entry point forms), delete (`TourStopsController#destroy`, which also destroys the elevator or entry point); ADD STARTING POINT (`starting_point` / `save_starting_point`, `ajaxplotstartingpoint`), BUILDING ENTRY / EXIT (`building_starting_point`, a GET that creates), ADD ELEVATOR (`add_elevator`), and a map with the stops' markers), Auto Wayfinding (§20). Elevators: `ElevatorsController#index` (images) / `#edit` (`_edit_elevator`: name, description, directional text, covering range, building, lock type / access code / lock, the Latch `_elevator_bank_block`, the gallery `elevator_galleries`). `Community#community_tour` = `tours.where(tour_user_id: nil).last` (visitors get copies; 2934 has 10 tours, one is the community's).
- **What the JSON already carried** (§17, §20): floorplates with `svg`, `svg_width` / `svg_height`, units and amenities with `svg_pointer`, the wayfinding graph with elevators, entry points, the tour and all its stops. **Missing:** the elevators' description, gallery and Latch banks.
- **DB (local dump, restored from staging).** SVG-mode properties (`enable_svg_mode`) with floor SVGs: **3837 Sylo** (5 floorplates, 5 SVGs; floor 1's SVG has 410 id'd shapes `A102`…, its 84 units carry `floorplate_id` but no position → the wizard's exact-match case; floors 0, 2–4 hold 312 pointer placements), **1468** (one floorplate: a 2942×1942 image *and* a 1412×912 SVG with 320 id'd polygons `_x32_`…; 3 pointer units, 127 raster units, 20 hallways, 4 elevators with a 3-photo gallery and Latch banks, 15 stops), **2934** (3 floorplates, 2 SVGs, 47 hallways, 4 elevators (Latch bank, gallery, Dwelo lock), 2 entry points, 20 stops on the community tour, 2 hidden), 4397 (1,087 pointers), 4100, 3970, 3902, 3808; raster: 2919, 1264 (multi-building, 15 entry points), 236 (sitemap). **Files:** CarrierWave stores to disk in development, so `svg_image.url`, elevator images and galleries point at the CMS host, which has no such files; the floor image's `standard_image_url` is its S3 copy, and the SVG's S3 copy sits beside it (`uploads/floorplate/svg_image/<id>/<file>`, verified with curl: 200, 2.6–5.5 MB).

### Change and data-source map

| New UI | Old Rails / UI source | Controller / action | Model / association | Real DB data | JSON | React | Change |
|---|---|---|---|---|---|---|---|
| Header, breadcrumb, Inventory / Tour Setup | `floorplates.json` meta | `floorplates#index` | Community | ✅ | existing | `propertyMap.screen` | rewritten |
| Building pills ("Tower A 19") | `_floorplate_map` building buttons, `Community#fetch_building_list` | `automate_plotting#index` | units / amenities `building`, `floorplates.building` | ✅ | existing (`buildings`) | `generateBuildingPills`, `mapBuildings` | new |
| Floorplate tabs with progress ("Done", "3/4", "No SVG") | floor buttons; `Floorplate#floors`, `#fetch_units` | `floorplates#index`, `units#index`, `amenities#index` | Floorplate, Unit (`floor`, `building`, `floorplate_id`), Amenity (`amenityable`) | ✅ | existing | `generateLevelTabs`, `itemsOfLevel`, `levelForFloor` (building-aware) | new |
| Add Floorplate | `floorplates#new` | — | — | — | — | inventory `FloorplateDialog` (exported) | reused; Save closes |
| "{building} · {floor} · n of m plotted" | plotexp counts | — | as above | ✅ | existing | `generatePlotPanel` | new |
| Auto Plot menu (this floorplate / building / property) | SVG section "Auto Plot" (`autoPlotUnits`) | — | units per level | ✅ | existing | `generateAutoPlotMenu` | new |
| Auto Plot wizard: Analyze (matched / manual / no match / skipped, table, closest hint, manual pick) | `svgAutoPlotting.js` matching | — | `units.marketing_name` / `floor` / `building`; polygon ids and labels of the stored SVG | ✅ | existing + `plan-svg` | `autoPlotRules.ts`, `AutoPlotDialog` | new |
| Wizard: Match Pattern (side, tokens, presets, find & replace, trim, pad & wrap, comparison, live preview, suggestion) | — (the legacy hard-codes its rules) | — | same | ✅ | — | same | new |
| Wizard: Confirm, Result, "Plot the rest manually", remember rules | `save_pointer_data` (not called) | — | — | — | — | same; `apRun` → `pinOverrides` | new, local |
| Manual Plot (tick items, click polygon), polygon popover with Unplot, Plotted tab, Unplot n items | SVG section click → `ajaxplotunitforfloorplate` with `pointer` (not called), `remove_plot_from_floorplate` | — | `pointer_data` shape | ✅ | — | `dropOnPolygon`, `unplotItems`, `SvgPlanLayer`, `PlotPanel` | new, local |
| The floor SVG and its polygons | `fetchSVG` / `setSVG`; `isValidShape` | (file) | `floorplates.svg_image`, `svg_metadata` | ✅ | **new route `/api/properties/:id/plan-svg`** (read) | `floorSvg.ts` (`measureFloorSvg`, `collectTargets`, `decodeIllustratorId`, `pointerTarget`), `SvgPlanLayer` | new |
| Stored SVG placements on their polygons | `processSvgBlock` (clone + fill) | `units#index`, `amenities#index` | `pointer_data` | ✅ | existing (`svg_pointer`) | `storedPlacement` → `space: 'svg'`, `polygon` | changed |
| Floor image, raster pins, hallways, elevators, entry points, doors, tour start, route | §20 | §20 | §20 | ✅ | existing | `generateLevelGraph(…, 'raster')`, layer toggle | changed (space-aware) |
| Search unit name or number; To Plot / Plotted | — | — | — | ✅ | — | `generatePlotPanel` | new |
| Grid, Publish, Upload SVG / Image, Remove Plan, Select / Place Pin / Junction / Connect / Move / Start Plotting Hallways, Run Algorithm, Selection, Building Starting Points, Vertical Connections, Marker Colors | §20 | §20 | §20 | ✅ | existing | kept from §20, restyled | kept |
| Tour Setup header, tabs and counts | sidebar treeview; `tours#index` | `automate_plotting#index` (JSON) | Tour, TourStop, Elevator, Hallway (`next_points`) | ✅ | existing | `generateTourSummary` | new |
| Tour Stops cards: name, type, image, Plotted / Not Plotted, building · floor, source, lock, Node n, talking point, Hidden pill | `tours/index.html.haml` stops table + the unit / amenity / elevator / entry-point forms | `units#index`, `amenities#index`, `automate_plotting#index` | TourStop → Unit / Amenity / Elevator / BuildingStartingPoint; `display_stop`, `sort`; `stop_description` / `directional_text` / `description` | ✅ | existing | `generateStopCards`, `initialTourState` | new |
| Distance ft / duration min | — (no column) | — | — | ❌ | — | "—" + note | gap T3 |
| View on Plan / Plot on Plan | edit icon / plotting page | — | — | ✅ | — | `mapHref` → `/map?level=&pin=&arm=1`; `usePropertyMap(map, initial)` | new |
| Move up / down, Hide / Show, Edit, Remove, Add Stop | `sort_stops`, `display_stop`, forms, `tour_stops#destroy`, `ajaxplottourstoppoint` (none called) | — | — | ✅ | — | `useTourSetup` | new, local (gap T1) |
| Elevators & Locks cards: name, Gated · vendor / Open access, building · serves floors · n photos, gallery, banks, directional text, description | `elevators#index` / `#edit`, `_elevator_bank_block` | `automate_plotting#index` | Elevator, ElevatorGallery, ElevatorBank, `lock_provider` | ✅ | **`elevators[].description`, `gallery`, `banks`** (new keys) | `generateElevatorCards` | new |
| Smart-lock gated toggle, Add Photo, reorder / remove photos, Add Elevator Bank, Delete | `elevators#update`, galleries, `add_elevator`, `#destroy` (none called) | — | — | ✅ | — | `useTourSetup` | new, local (gap T4) |
| Lock Vendors | Integrations Hub | — | — | — | — | `propIntegrationsRoute` | reused |
| Routing: From / To, Compute Multi-Floor Route, result | `shortest_path` (whole tour, §20) | — | Hallway, Elevator, Door, BuildingStartingPoint | ✅ | existing | `stopRoute.ts`, `stopEndpoints` | new, local (gap T6) |
| Building Starting Points rows, Open Map & Plotting | `tours#building_starting_point` | — | BuildingStartingPoint, Tour | ✅ | existing | `tourStartPointRows` (reuses `generateStartPointRows`) | reused |
| Publish to Touch App | — (no publish in the CMS) | — | — | ❌ | — | dialog | gap T5 / M2 |

### Backend (read-only JSON only)

| File | Change |
|---|---|
| `app/serializers/connect/wayfinding_serializer.rb` | `#elevators` adds `description`, `gallery` (`elevator_galleries`: id, name, url) and `banks` (`elevator_banks`: id, name, position, lock_type, lock_name), one query each for the property |

Nothing else changed on the Rails side: no business logic, business rule, calculation, validation, authorization, schema, migration, model, association, route, unrelated controller, or write behaviour; the HTML pages and their queries are untouched. The floor SVG is read by this app's own route handler through the existing scoped `floorplates.json`, not by a new Rails action.

### Frontend

- **Route handler** `app/api/properties/[propId]/plan-svg/route.ts` (GET): resolves `?floorplate=<id>` / `?sitemap=<id>` through `floorplates.json` (401 → 401, 302 / 404 → 404), fetches the stored SVG and returns it as `image/svg+xml` (private, 10-minute cache); a 404 from the CMS host (development file storage) falls back to the S3 copy beside the floorplate's image. `APP_API.planSvg`.
- **SVG:** `core/utils/map/floorSvg.ts` — `measureFloorSvg` (parse, mount off-screen at viewBox size, `getBBox` + `getCTM` per shape), `collectTargets` (id'd shapes and named groups of shapes, `Units` scope, no outline / label / text / icon layers), `decodeIllustratorId`, `pointerSelector`, `pointerTarget`, `toViewBoxPercent`.
- **Auto Plot:** `core/utils/map/autoPlotRules.ts` — the design's rules (`ApRules`), tokens, presets, trims, `apUnitKey` / `apPolygonKey` / `apNorm`, `apAnalyze` (matches codes and labels; manual picks; closest hint; loading / no-SVG rows), `apSuggest`, `apRuleSummary`, `apDraftProblem` (validation).
- **State / generators** (`core/utils/generator/map/`): `mapState.ts` (`PlanSpace`, `PinOverride { space, polygon }`, `TempNode.space`, plot selection, `svgDocs`, `AutoPlotState`, `apPatterns`, `floorplateDialog`), `mapLevels.generator.ts` (`scopeLabel`, `mapBuildings`, `levelsOfBuilding`, building-aware `levelForFloor`, `levelSvgDims`, `levelSpaceDims`, `activeSpace`, `defaultSpace`), `mapNodes.generator.ts` (space-aware placements and graphs, `generateRasterGraphs`, `itemsByPolygon`, `polygonOfPin`, `unitNumber`), `mapPanels.generator.ts` (`generateBuildingPills`, `generateLevelTabs` with progress states, `generatePlotPanel`, `generatePolygons`, `generateSelectedPolygon`, `generateAutoPlotMenu`, the rest updated). The phase 2g OCR helper (`autoPlot.ts`) was removed (superseded; gap M4 stands).
- **Hook** `core/hooks/usePropertyMap.ts` (`MapInitial` from the URL; buildings, layers, Manual Plot, polygon click / hover / popover, unplot, floor SVG loading per level and per wizard scope, the wizard's state machine and every rule action, remembered rules, Add Floorplate dialog).
- **Screen** `core/screens/properties/propertyMap.screen.tsx` (rewritten to the design's shell), `map/SvgPlanLayer.tsx` (new: mounts the SVG once, wires the targets by selector, restyles them in place, delegates pointer events), `map/MapCanvas.tsx` (the SVG layer, the image layer, polygon labels, the popover, loading / failed / no-SVG states), `map/MapPanels.tsx` (`PlotPanel` new; the others kept), `map/MapDialogs.tsx` (`AutoPlotDialog` new; the inventory's `FloorplateDialog` reused, exported from `InventoryDialogs.tsx`; an `ImageViewer` for its previews).
- **Tour Setup:** `core/utils/generator/tour/tourSetup.generator.ts` (`TourLocalState`, `initialTourState`, `generateStopCards`, `generateElevatorCards`, `stopSourceOptions`, `stopEndpoints`, `generateTourSummary`, `tourGraphs`, `tourStartPointRows`), `core/utils/wayfinding/stopRoute.ts` (multi-floor Dijkstra), `core/hooks/useTourSetup.ts`, `core/screens/properties/tourSetup.screen.tsx` (three tabs, Add / Edit Stop, Add Elevator Bank, confirm and publish dialogs), `app/(connect)/properties/[propId]/tour-setup/page.tsx` (real for numeric ids, the demo screen for slugs, as the map page) + `loading.tsx`.
- **Model / parser:** `propertyMap.data.ts` (`ElevatorPhoto`, `ElevatorBank`, `MapElevator.description / gallery / banks`), `wayfinding.parser.ts`.
- **Strings:** `CORE_STRINGS.mapPlotting.*` regenerated to the design's wording (385 keys), `CORE_STRINGS.tourSetup.*` new (161 keys); `resources/i18n/index.ts`.
- **CSS:** `.bo-map__*` for the pills, tabs with progress, toolbar, pathways strip, SVG layer, polygon labels and popover, the plot panel; `.bo-ap__*` for the wizard; `.bo-tour__*` for Tour Setup.

**Components reused:** `Breadcrumb`, `Modal`, `StatusPill`, `Switch` classes, `Icon`, `SafeImage`, `ImageViewer`, the inventory `FloorplateDialog` (+ `DialogFooter`, `FormRow`, `YesNo`, `SwitchField`, `UploadSlot`), `.bo-inv__*` header / buttons, `.bo-field`, `.bo-btn`, `.bo-dlg__*` form classes, the toast (`demoActions.showToast`), `plainText` / `layoutText` / `t` from the inventory text helpers, `loadPropertyMap`, the inventory and wayfinding parsers.

**New components, and why**

| New | Why nothing existing would do |
|---|---|
| `map/SvgPlanLayer.tsx` | Nothing mounted an SVG document and made its own shapes interactive; the canvas drew images and absolutely positioned markers only |
| `AutoPlotDialog` (in `map/MapDialogs.tsx`) | A four-step wizard with a rule builder and a live table; no existing dialog has steps, a two-column rule / preview layout or editable rows |
| `PlotPanel` (in `map/MapPanels.tsx`) | The design's ticked To Plot / Plotted lists with select-all, search and Unplot; the phase 2g queue was single-arm |
| `tourSetup.screen.tsx` + `useTourSetup` + `tourSetup.generator.ts` + `stopRoute.ts` | The Tour Setup screen existed only on demo data (`s.demo`), with no real-record model, no stop / elevator descriptors and no route over the stored graph |

### Verification (local DB, Rails :3000 + `next dev` :3001, headless Chrome through Playwright with a minted Devise session)

- **JSON:** `automate_plotting.json` for 1468 carries the new elevator keys (Elevator 1: `description` null, a 3-photo `gallery`, `banks` []; 2934's Elevator Bank: Latch bank "mkmk · jnjn · Latch 2410"); the rest of the payload is unchanged. `plan-svg?floorplate=3043` (1468) 200 in 4.5 s (2.66 MB, through the S3 fallback), `?floorplate=3303` (3837) 200 (5.5 MB); an unknown plate 404; signed out 401.
- **Canvas on real SVGs:** 1468 mounts its 1412×912 floor SVG; the three stored pointer units (PH-0913 / 0914 / 0916, `pointer_data.id` `_x34_7_…` etc.) resolve to their polygons and draw as filled polygons with their labels at the stored viewBox positions; the layer toggle shows the 2942×1942 image with the 127 raster pins, 20 hallway nodes and 4 elevators of §20. 3837 Sylo: five floorplate tabs read Done · 1/88 · Done · 104/106 · 91/94 from the real placements; floor 0's ten pointer units sit on polygons A152–A170; 236 (sitemap) and 1264 (multi-building raster) still render.
- **Manual Plot on Sylo floor 1:** ticking B-B101 and C-C101 and clicking polygon A150 drops both (label "A150 · B-B101 +1", To Plot 87 → 85, Plotted 1 → 3); the popover lists both as "Temporary · this page only" and Unplot returns one. **Auto Plot on Sylo floor 1:** Analyze reads **85 matched · 0 manual · 0 no match · 1 skipped** (the amenity), every row "Exact match" (B-B101 → B101 → B101 …); Match Pattern's live preview recomputes on every rule ("Stack only": 0 of 85, "−85 vs current rules", example "B101 → 01"); Confirm reads "Plot 85 units · All buildings · Floor 1? · Exact match · 85 units by exact match · 1 unplotted item stay in To Plot"; Result "85 plotted · 1 left for Manual Plot (C_COURT_06_0071.jpg: amenities are plotted manually)"; the map then shows 86 polygon placements and the tab 87/88.
- **Tour Setup on 2934:** header "20 stops · 2 hidden from the tour"; tabs 20 / 4 / 44 (44 = the property's stored hallway links); cards in sort order with the real kinds, images (where files exist), Plotted pills, buildings and floors ("1 · JD", "2 Bed · 2 Bath · Floor 1"), sources, Latch / Dwelo lock labels, stored directional texts ("Directional text of Elevevator", unit stop descriptions); Elevators & Locks lists Elevator 1–4 with "Gated · Dwelo" on Elevator Bank, its Latch bank, the gallery photo; Routing lists the two entry points ("Set") and routes between real stops over the 47 hallways.
- **Playwright** (`mapPlotting.spec.ts`: 1468 SVG flow + 2919 raster flow + not-found; `tourSetup.spec.ts`: 2934 + not-found): both pass; the whole suite with the session env (demo screens, routes, interactions, amenities, map, tour) is **87 passed** in 2.2 minutes, no font failures this run. Every real-data spec asserts **0 non-GET requests and 0 page errors**; the smoke runs over 236, 1264, 1468, 2919, 2934 and 3837 (map and tour) recorded the same.
- **Pixel review:** the prototype driven from `file://` (Sign in → Properties → Luxe Mile High → Map & Plotting / Auto Plot / Tour Setup tabs) beside the React screens: same header, building pills, floorplate tabs with progress bars, toolbar (Auto Plot menu, Manual Plot On/Off pill), plot panel anatomy (search, two tabs, select-all, ticked rows, Unplot), wizard (step rail, four stat tiles, tables, rule builder, live preview, confirm rows, result tiles), Tour Setup cards (icon, name, type tag, pill, view button, up / down / Edit / delete, meta row, talking point), elevator cards and the routing grid. Deliberate differences: the read-only note, the pathways strip, the plan bar and the side panels the brief keeps; polygon labels only where something is plotted; Hide / Show and the lock label on stop cards (real `display_stop` and lock providers); "—" for distance / duration; "n stops · m hidden" instead of "staged · not yet published".
- `npm run typecheck` ✅.

### Traps found in this phase

1. **Development file storage.** `svg_image.url`, elevator images and galleries point at the CMS host in development, which holds none of the files of a database restored from staging; the floor image works only because `standard_image_url` is the S3 copy. The `plan-svg` route reads the S3 copy beside the image when the host answers 404; photos say "Photo unavailable".
2. **Illustrator ids.** `pointer_data.id` is the raw, escaped, suffixed id; the design's polygon id is the decoded one. Match on the raw id first, decode for display and matching.
3. **`getBBox` needs a mounted SVG.** Bounding boxes are measured on an off-screen copy at viewBox size (width/height set to the viewBox), with `getCTM` for shapes inside transformed groups.
4. **Do not filter shapes by layer name.** Real floor SVGs keep their rooms under layers named Footprints, Elements, Library…; only the legacy's outlines / label / text / icon rule applies (an earlier "artwork layer" filter hid every room of the 1468 SVG).
5. **Two coordinate spaces.** A floorplate can hold a raster placement (`x_plot/y_plot`, image pixels) and an SVG one (`pointer_data`, viewBox units) for different units; the level's layer decides which are drawn, and every local edit records its space.
6. **A `};` inside an English string** ("{level}; the CMS runs…") broke a naive scan for the end of the string table; anchor on a line break before `};`.

### Remaining

- Gaps M10–M13 (`gaps_map_plotting_feature.md`) and T1–T7 (`gaps_tour_setup_feature.md`); M1–M9 as before.
- Commit (no AI attribution), then PR against `main`. Deploy both apps when wanted (Rails: the one serializer; Connect: the screens and the route handler).

---

## 23. Phase 2j: Inventory and property issues — images, loading, floor strip, hydration, the Hazel pass (September 27, 2026)

**Brief:** `issues_in_inevntory_properties.md` (untracked, like the other briefs). Fix the amenity images that read "Image unavailable" in the Edit dialog and "This image could not be loaded" in the eye viewer, add the old system's loading animation everywhere the app loads, make the Map & Plotting floorplate list a horizontal strip with working arrows, rebuild the Edit Tour Stop dialog to the plotting design, investigate the `cz-shortcut-listen` hydration warning, and validate everything end to end on the Hazel property with real UI tests. Minimal read-only JSON on existing controllers is allowed; the old Rails pages remain the behaviour source of truth.

**Branch:** `feature/inventory_properties_issues`, from `feature/map_plotting_tour_setup` (`7539ffe7c`).

### Investigation and reproduction (before any change)

Every issue was reproduced in a clean headless Chrome (Playwright, no extensions) against the running CMS and `next dev`, on Hazel (property **1618**: QuadReal, Burnaby BC, 238 units, 17 floor plans, 31 floorplates with floor images and no floor SVG, 6 amenities, a 13-stop tour with 3 elevators and 220 hallway nodes).

| Issue | Current behaviour (reproduced) | Old system behaviour | Root cause | Fix | Test |
|---|---|---|---|---|---|
| Amenity Edit: gallery photos "Image unavailable" | Penthouse South Lounge's 4 gallery photos requested from `http://127.0.0.1:3000/uploads/amenity_gallery/image/970/…`; the CMS answered its 404 page, Chrome reported `ERR_BLOCKED_BY_ORB`; the amenity's own image loaded | `amenities/_edit_amenity.html.haml` renders `amenity_gallery_image.image.url`; on staging that URL is `https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity_gallery/image/970/…` (fog storage) and the photo renders | `AvatarUploader` stores to disk in development (`storage Rails.env.development? ? :file : :fog`) while this database was restored from staging: `image.url` names a file this machine never had. The amenity's own image works because the CMS persists its S3 URL in `standard_image_url` (`StandardUrl#set_standard_url`), which the JSON already preferred; gallery rows have no such column | `Connect::UploadUrl.upload` answers the S3 copy when an uploader on file storage names a file that is not on disk (below) | `hazel.spec.ts` "Amenities": 4 photos, sort order, every `<img>` on `amazonaws.com/uploads/amenity_gallery/image/`, all decoded, 0 "unavailable" |
| Eye viewer: "This image could not be loaded" on photo 2 of 3 | Same URLs, same failure; photo 1 (the amenity image) loaded | Legacy lightbox opens `image.url` | Same | Same; the viewer also gained a real loading state | `hazel.spec.ts` "Amenities" (1 of 3 → 2 of 3 → 3 of 3, arrows, keys, close) and "image viewer" (loading, failure) |
| No global loading state | Route `loading.tsx` files showed a line of text; images, the floor SVG and the wizard showed text or nothing | `.divLoading` / `.mapLoading` / `.modal-loader` overlays with `app/assets/images/loader.gif` (the cat with the pinwheel, 320 × 320, 357 KB) | No shared component | `LoadingIndicator` + `useImageStatus`, used everywhere below | `hazel.spec.ts` "Loading", "image viewer", "floor SVG" |
| Floorplate list grows vertically; arrows dead | 31 tabs wrapped into a 570 px tall block; `scrollWidth == clientWidth`, both arrows disabled | The legacy page shows floor buttons in a row | `globals.css` kept two `.bo-map__levels` rules: the older one (`flex-wrap: wrap`, from the phase 2g layout) survived the plotting-design rule, which never set `flex-wrap`; the tabs wrapped, nothing overflowed, so the arrows had nothing to scroll | The stale rule removed, `flex-wrap: nowrap` explicit; page-wide scrolling per click; the selected tab scrolls into view; arrow state only re-renders on change | `hazel.spec.ts` "horizontal floorplate strip", "deep link", "3 floorplates … 19 scroll" |
| Edit Tour Stop: Cancel / Save Changes stacked | The footer note (`flex: 1 1 260px`) plus two buttons wrapped inside the 520 px footer (`flex-wrap: wrap`) | Reference: one row, Cancel then Save Changes, 42 px | Footer layout | Note on its own row; the tour dialogs get the design's 22/24 px paddings, 18 px title, 42 px buttons that never wrap above 560 px | `hazel.spec.ts` "Tour Setup": panel 520 px, both buttons 42 px on one row, Cancel left of Save |
| Hydration warning `<body cz-shortcut-listen="true">` | Not reproducible in a clean browser: `document.body` has no attributes and no console warning on Property Detail, Inventory, Map & Plotting or Tour Setup | — | `cz-shortcut-listen` is the attribute the ColorZilla Chrome extension adds to `<body>` on load; React 19 reports it as a server/client mismatch. `app/layout.tsx` renders a static `<html>`/`<body>`; nothing in the tree reads `Date`, `Math.random`, `window` or ids during render (the only client-only reads are inside `useEffect` or event handlers) | **No application change.** Not suppressed either: the warning is real in that browser and goes away with the extension off or in an incognito window | `hazel.spec.ts` "Hydration": zero body attributes and zero hydration messages across the four screens |

Two smaller findings on the way: the sidebar logo's `next/image` warned on every page because CSS fixed only its height (now both sides are set to the rendered 103 × 24); and the floorplate card never showed "No SVG" because the state was only reached when a floorplate had no plan at all (it now reads "No SVG · plotted/total" for a floorplate with a floor image and no SVG, as the plotting design lists it).

### Amenity images: the data flow, traced

```
Old:  AmenitiesController#edit → @amenity.amenity_galleries.order(:sort) → AmenityGallery#image (AvatarUploader, mount_base64_uploader)
        → image.url → :fog (staging/production) https://<bucket>.s3….amazonaws.com/uploads/amenity_gallery/image/<id>/<file>
                    → :file (development)       /uploads/amenity_gallery/image/<id>/<file> on the CMS host (no file locally)
      the amenity's own image: standard_image_url (S3, copied after upload) through S3Acceleration#validated_image_url

New:  AmenitiesController#index (format.json) → Connect::AmenitySerializer → Connect::UploadUrl
        → image: UploadUrl.file(amenity, :image)            = standard_image_url (unchanged)
        → gallery[].url: UploadUrl.upload(photo, :image, bucket: bucket_of(amenity, hint))
             uploader.url; when the uploader is on file storage and the file is not on disk → "#{bucket}#{uploader.url}"
             bucket = the S3 base of the amenity's standard_image_url, else the property's (bucket_hint: first standard URL among
             its floorplates, amenities, units, floor plans; queried at most once per listing, only when needed)
      → inventory.parser (`gallery[].url`) → amenityImages() → InteriorGrid / ImageViewer → <img src> (S3, public-read)
```

All six Hazel photos exist on the same bucket as the amenity's own image (`images-pynwheel-cms-v2`, HEAD 200, also through `s3-accelerate`).

**Heroku (same day, after the deploy of `5cd51a59`):** the galleries were still broken on `pyn-system` / `pyn-system-connect`. Different cause, same family: that CMS runs `RAILS_ENV=production` on fog storage with `S3_BUCKET_NAME=staging-pynwheel`, but its database (Heroku Postgres, a production copy) names every amenity image on `images-pynwheel-cms-v2` (45,266 + 10,906 rows, none on `staging-pynwheel`), so fog builds `https://staging-pynwheel.s3….amazonaws.com/uploads/amenity_gallery/image/968/…` (HEAD 403 on both host forms) for a file that exists at `https://images-pynwheel-cms-v2.s3.amazonaws.com/…` (200). The legacy pages on that app produce the same 403 URL. `UploadUrl.upload` now also handles fog storage: when the record's family names a different bucket than the configured one, it HEADs the configured URL and, if that fails, the family's copy, and answers the one that exists (answers cached in `Rails.cache` — Redis on Heroku — for a day; a check that cannot be made keeps the configured URL). Verified from a Rails runner against the real buckets: differing buckets → the family's URL; same bucket, no family hint, a non-S3 path, a configured URL that answers, or neither answering → unchanged. The dyno's recurring `R14 Memory quota exceeded` is a pre-existing sizing issue, unrelated. The same rule now serves every other upload without a stored S3 URL: floorplate SVGs (the `plan-svg` route's own bucket guess was removed; the listing already names the S3 file), secondary images of floor plans and units, elevator images and galleries, the sitemap's files and the shared SVG background. On staging and production the uploader's URL is already the S3 one and the rule never fires. `staging-pynwheel` objects without public-read (some 2934 elevator and stop images, HEAD 403 on the CMS's own `standard_image_url` too) still cannot render anywhere, and the UI now says so only when the request itself fails.

### Loading: one component, the old asset

- **Asset:** `app/assets/images/loader.gif` copied unchanged to `pyn-connect-web/public/images/loader.gif` (same bytes). `loader_.gif`, `loader1.gif` and `dots_loader.gif` are the legacy's other spinners; the cat is the one behind `.divLoading`, `.mapLoading` and `.modal-loader`.
- **Component:** `core/components/atoms/LoadingIndicator.tsx` — `role="status"`, `aria-live="polite"`, the GIF on an 84 px white disc with a caption, five variants (`page`, `block`, `inline`, `cover`, `overlay`), a 200 ms delayed fade-in so a fast load never flashes it, and `prefers-reduced-motion` hides the animation and keeps the caption. The `page` variant is what the legacy `.divLoading` was: a fixed veil that mildly dims the whole screen (sidebar and top bar included) with the animation at the exact centre of the viewport, shown at once rather than faded in, because Next swaps a route's loading boundary for a nested one mid-load (the `[propId]` one, then the screen's own) and a restarted fade would blink; `cover` does the same over its stage (the viewer, the map canvas). Traced in a slowed navigation: the veil is continuous from the moment the payload starts streaming until the screen mounts. Note that Next's router keeps the previous page on screen until the new route's payload *starts* streaming, so pure network latency before the first byte shows no loading state; the veil covers the time the server spends on the CMS reads.
- **Hook:** `core/hooks/useImageStatus.ts` — loading / ready / failed per `src`, also reading `complete` / `naturalWidth` on mount for an image that finished before React attached its handlers. Used by `SafeImage`, `MediaThumb`, `UploadSlot`'s preview, `ImageViewer` and the map canvas image.
- **Where it shows:** every route `loading.tsx` (companies, properties, property, inventory, map, tour setup, unit detail) plus a new `(connect)/loading.tsx` for routes without their own; every thumbnail and gallery photo (overlay); the image viewer's stage (cover with "Loading image…"); the floor SVG and the floor image on the map canvas (cover); the Auto Plot wizard's "n units wait for their floor SVG" note and the Routing panel's "Routing…" (inline). Errors stay errors: `onError` / a failed request is the only way to "could not be loaded".

### Map & Plotting: the strip

`propertyMap.screen.tsx`: `scrollTabs` moves by one visible page (the strip's width less a tab), the selected tab is scrolled into view when `state.levelId` changes (deep links from Tour Setup land in view), and `measureTabs` only writes state when an arrow's answer changes, so smooth scrolling no longer re-renders the editor on every scroll event. Add Floorplate stays the last item of the row and opens the inventory `FloorplateDialog`; Save closes it. Canvas behaviour is unchanged: picking a floor still loads its image or SVG, polygons, pins, nodes, paths and the selection (the mapPlotting and Hazel specs assert it).

### Tour Setup: the Edit Tour Stop dialog

Same data as before (the stop's own name, kind, building and floor from the wayfinding JSON; its directional text as the talking point), on the reference's dialog: 520 px, 18 px title, the read-only note on its own row, Cancel and Save Changes 42 px side by side (the measured button boxes match the prototype's to the pixel). Validation lives in `dwellTimeProblem` (`tourSetup.generator.ts`): a dwell time is a whole number of minutes 0–999 or empty; the field shows the message, Save is disabled, and `saveDialog` refuses anyway. Save applies to the page's state only; Cancel discards; nothing is sent.

### Old-system flows discovered and verified

| Flow | Entry point | Controller / action | Data loaded | Interaction, modal, state | Error / empty | Navigation |
|---|---|---|---|---|---|---|
| Properties → property | sidebar | `communities#index` / `#edit` | Community | — | — | Connect: `/properties` → `/properties/:id` |
| Amenity Images | property menu | `amenities#index` (`index.html.haml`, `_index`) | `community.amenities.order(id: :desc)`, `show_amenity_name` | ADD FILES (`create`, `AmenityImagesJob`), "Show Amenity Name on Webpages" toggle (`update_amenity_toggle`), per-image crop modal (`show_amenity_image_in_modal` → Jcrop → `crop_amenity_image`), lightbox on the image, delete | no amenities → the upload box only | Connect: Inventory → Amenities tab |
| Amenity edit | pencil on the image | `amenities#edit` (`edit.html.haml`) | Amenity, `ordered_doors`, floors of the building's floorplates, lock providers | form: name, video label / link, building, floor (select over the plotted plate's floors, else a text field), type, lock provider / door / access code / lock search, Show in Stops List, description and directional text (wysihtml5), the gallery (`_edit_amenity`: sortable, lightbox, pencil → `amenity_galleries#edit` modal (name), delete → `amenity_galleries#destroy`), drag-and-drop upload (`saveAmenityGallery`) | — | back to Amenity Images / the unit or floor plan it belongs to (`previous_url`) |
| Property Map → Floor plates → Plot Units | property menu | `floorplates#index` → `#plotexp` | floorplates, units, amenities, `svg_metadata`, `pointer_data` | image / SVG plotting (§22) | no SVG → image section only | Connect: Map & Plotting |
| Property Map → Auto Wayfinding | property menu | `automate_plotting#index` | hallways, elevators, entry points, doors, tour, stops | pathway tools (§20) | — | Connect: Map & Plotting "Pathways & pins" |
| Tour Setup → Tour Stops | sidebar (self-tour) | `tours#index` | tour, stops, elevators, entry points | building / floor buttons, add unit / amenity (`ajaxplottourstoppoint`), sortable list, eye, edit (→ the unit / amenity / elevator / entry point form), delete (`tour_stops#destroy`) | no stops → empty table | Connect: Tour Setup → Tour Stops |
| Elevators | sidebar | `elevators#index` / `#edit` | elevators, `elevator_galleries`, `elevator_banks` | name, description, directional text, floors, building, lock, gallery, banks | no photo → none shown | Connect: Elevators & Locks |
| Floor plans, Units | property menu | `floorplans#index`, `units#index` | listings, images, interior amenities | edit forms, crop modals | — | Connect: Inventory tabs, Unit Detail |

### Test matrix (from the old system's cases) and results

| Area | Cases | Where |
|---|---|---|
| Images | one image (The Lobby), several (Fitness Centre: own + 2, Penthouse South Lounge: 4 in `sort` order), no image (the Add dialog's drop zone; no Hazel — or any — amenity lacks one in this database), slow file (loading state), broken file (failure text), next / previous / keys / close | `hazel.spec.ts` Amenities, image viewer |
| Floorplates | no SVG (all 31 Hazel plates, "No SVG · n/n"), SVG present (1468, with the canvas loading state), plotted / partial / none (the progress bar and label), 3 plates (203, no scrolling, arrows off), 19 (816), 31 (Hazel), first / middle / last selected (deep links `?level=floorplate:2241 / 2256 / 2271`) | `hazel.spec.ts` strip, deep link, 3 / 19, floor SVG; `mapPlotting.spec.ts` |
| Units | plotted / not plotted, available and other statuses, provider id, manual and feed values | `mapPlotting.spec.ts`, `amenities.spec.ts`, phase 2f specs (unchanged) |
| Amenities | image / gallery, video (Fitness Centre's 3D Tour link) / none (Boardroom), plotted, in / hidden from stops (Penthouse South Lounge), lock provider (Zerv → "Pynwheel Access") / none, search, Type and Floor filters | `hazel.spec.ts` Amenities; `amenities.spec.ts` (2157) |
| Modals | open, close, validation (dwell time), Save (local), Cancel (discard), empty state, read-only note, no request | `hazel.spec.ts` Tour Setup, Amenities |
| Navigation | forward / backward arrows, direct selection, deep links, Properties → Detail → Inventory → Amenities → Map ↔ Tour Setup, browser back | `hazel.spec.ts` Navigation, strip |
| Loading | route loading (slowed payload, activated without prefetch), image loading, SVG loading, error state | `hazel.spec.ts` Loading, image viewer, floor SVG |
| Hydration | clean-browser console and `<body>` attributes on the four screens | `hazel.spec.ts` Hydration |

**Results (Sep 27):** `tsc` clean; `tests/e2e/hazel.spec.ts` 12 passed (43 s); the existing suites (amenities, mapPlotting, tourSetup, screens, routes, interactions) 87 passed (2.1 min) — 99 in all. Every real-data test ends on the same assertion: no non-GET request left the browser. Hand checks in the browser pane and Playwright scripts: Hazel's gallery photos and viewer (all 200 from S3), the strip at 31 / 19 / 3 plates, the Edit Tour Stop dialog against the prototype's own dialog (button boxes identical: Cancel at x 734.75, Save Changes at x 826.6, both 42 px), the loading indicator on the viewer, the map canvas and a slowed route.

### Backend

Rails changes, all read-only JSON: `app/serializers/connect/upload_url.rb` (the S3 resolution above, `bucket_hint`, `bucket_of`), and a `bucket:` argument threaded through `amenity_serializer.rb`, `floorplan_serializer.rb`, `unit_serializer.rb`, `floorplate_serializer.rb`, `wayfinding_serializer.rb` and the sitemap / shared-background block of `FloorplatesController#render_connect_floorplates`. No business logic, business rules, schema, migration, validation, authorization, storage configuration or unrelated backend behaviour changed; no file was moved or written.

### Components

Reused: `Modal`, `SafeImage`, `MediaThumb`, `UploadSlot`, `ImageViewer`, `InteriorGrid`, `FloorplateDialog`, `ListingScreenTemplate`, the map and tour screens. New: `LoadingIndicator` (the one loading component), `useImageStatus` (the one image-state hook), `(connect)/loading.tsx`. Removed: the `plan-svg` route's bucket fallback, the stale floor-tab CSS.

### Remaining

- `staging-pynwheel` objects that are not public-read (some elevator and stop images of 2934) cannot render in any UI; not a Connect gap.
- Every write remains local (M1–M13, T1–T7, GA3): plotting, stop edits, dwell time, uploads, publish.
- The eye viewer streams the full-size photo (some Hazel photos are 5,000 px wide); the CMS's `thumb` versions are not exposed and the legacy pages use the full file too.

---

## 24. Phase 2k: Inventory on demand, listing sorting, Map & Plotting review (September 30, 2026)

**Brief:** `improvments_relatd_to_ploting_listing_inventory.md` (untracked, like the other briefs). Find why Inventory opens slowly for John Demo and stop loading inventory data before it is needed (measured before and after); add Ascending → Descending → Default column sorting to Companies and Properties; align Map & Plotting with `pyn-system-plotting.html` on real data. Read-only rule and minimal JSON changes as before.

**Branch:** `feature/plotting_sorting_inventory_perf`, from `main` (`b04012b4a`). The brief names `feature/properties_inventory_improvments`, which is already merged into `main`.

**Scope decision (asked, Sep 30):** Companies and Properties are paged by the CMS at 10 rows per page, so sorting only the rows on screen would sort 10 of 217 / 802. The user chose **whole-list sorting on the server**: a whitelisted `sort` / `dir` on the two existing Connect listing queries (ORDER BY only; default order unchanged).

### Root-cause / task map

| Area | Current behaviour (measured) | Root cause | Change | Result |
|---|---|---|---|---|
| Properties listing | 1 CMS read (`communities.json`). A production build prefetches `/properties/:id`, `/inventory`, `/map`, `/branding` for each row in view and 16 sidebar routes: RSC requests with `Next-Router-Prefetch`, which stop at the `loading.tsx` boundary; **0 inventory reads reach the CMS** | — (the listing never loaded inventory data) | none | unchanged, verified |
| Property Detail | 1 CMS read (`communities/:id/edit.json`); same prefetches, 0 inventory reads | — | none | unchanged, verified |
| Inventory click | The route waits for **all four listings** (`Promise.all`) and serializes all of them to the client. `units.json` is ~93 % of it (1411: 288 KB of 301 KB RSC; Hazel: 506 KB of 547 KB) and the slowest listing, yet only the Units tab and the unit-dependent dialogs read it | `loadPropertyInventory` fetched and shipped everything for every tab | Units are fetched only when the Units tab (or a dialog that needs units) first opens, once; the Units badge reads a new `meta.unit_count` on `floorplates.json` | RSC 301 → 32 KB (1411), 547 → 60 KB (Hazel); server 0.14 → 0.06 s, 0.25 → 0.06 s |
| Companies sorting | none | — | `ListingSort` + `AccessibleCompaniesQuery.sorts`; sortable headers | 4 columns |
| Properties sorting | none | — | `AccessibleCommunitiesQuery::SORTS`; sortable headers | 4 columns |
| Map & Plotting | On real data since phase 2i/2j, but with rows the plotting design does not have: Grid, Floor SVG / Background image, Publish, the Pathways & pins strip, the plan bar, a read-only banner and seven side panels (kept then because the briefs asked for them). The Building row was also hidden for a one-building property | The Sep 30 brief listed those rows again (§13–15); the user then pointed at the design, which shows only "{floor} · n of m plotted · Auto Plot · Manual Plot", and chose **match the design exactly** | Removed those rows and panels; the Building row always shows; the plan sits inset on a white canvas; floors with both files show the SVG; the no-SVG drop zone uses the design's wording and only "Choose SVG File" | the screen matches `pyn-system-plotting.html` |

### Measurements (local: CMS on :3000 with `pynwheel_development`, Connect production build on :3004, headless Chrome, minted super-admin session)

John Demo locally is **1411 "John Pynwheel Demo"**: 4 floorplates, 8 floor plans, 230 units, 7 amenities (the 6 / 7 / 294 in the brief are the Heroku database's; Heroku was not measured from here). Hazel is 1618 (31 / 17 / 238 / 6). CMS requests were counted from `log/development.log` per step; browser requests from Playwright.

| Metric | Before | After |
|---|---:|---:|
| Inventory CMS reads while on Properties (search → hover → idle) | 0 | 0 |
| Inventory prefetches from Properties (browser, stop at `loading.tsx`) | 1 per row (`/inventory` RSC) | 1 per row (unchanged, no CMS read) |
| CMS reads when Inventory opens (Floorplates tab) | 4 (floorplates, floorplans, units, amenities) | 3 (floorplates, floorplans, amenities) |
| CMS reads on first Units tab | 0 | 1 (`units.json`, via `/api/properties/:id/inventory/units`) |
| CMS reads on later tab switches | 0 | 0 |
| Inventory RSC payload, 1411 / Hazel | 301 KB / 547 KB | 32 KB / 60 KB |
| Inventory HTML (full load), 1411 / Hazel | 378 KB / 747 KB | 75 KB / 212 KB |
| Inventory server time (RSC), 1411 / Hazel | 0.14 s / 0.25 s | 0.06 s / 0.06 s |
| Units listing (only when the Units tab opens), 1411 / Hazel | in the page | 270 KB, 0.11 s / 487 KB, 0.21 s |
| Deep link `?tab=units` | 301 KB / 547 KB | same (units fetched on the server; 0 extra requests) |
| Duplicate requests | 0 | 0 (one units request; a second trigger joins it; revisits reuse it) |
| Click → tabs hydrated (1411) | 397 ms | 399 ms (dominated by client work locally; the saving is server time and bytes) |

CMS per-listing times, 1411 (cold / warm): floorplates 0.36 / 0.02 s, floorplans 0.11 / 0.03 s, **units 0.31 / 0.11 s (288 KB)**, amenities 0.06 / 0.03 s. Hazel: units 0.30 / 0.20 s (506 KB), the rest ≤ 0.05 s. Locally the whole inventory loads in well under a second; the slowness reported on Heroku comes on top of this (the CMS dyno's R14 memory warnings, and `Connect::UploadUrl.reachable_copy` HEADs S3 for a record family whose bucket differs from the configured one when its day-long cache is cold, which hits the image-heavy units listing hardest). Deferring units removes that listing from the Inventory's critical path on every host.

### Backend (read-only)

| File | Change |
|---|---|
| `app/controllers/floorplates_controller.rb` | `render_connect_floorplates` meta gains `unit_count: UnitFilterQuery.new(community).results.count`: the same unfiltered query `units#index` JSON answers with (checked equal to `units.json` length on 1411, 1618, 348, 1625, 4397, 236, 3837, 1414) |
| `app/queries/listing_sort.rb` (new) | Whitelisted column sort: `sort` must name an offered column and `dir` be `asc` / `desc`, else the default order; `… NULLS LAST` then the default order as the tie-break. `PROVIDER_LABELS` mirrors the frontend's `providerLabel`, so provider columns sort on the label shown ("psi" as "Entrata / PSI"). Built without a DB connection (safe at class load / asset precompile) |
| `app/queries/accessible_companies_query.rb` | `sorts`: `name`, `status` (Active before Inactive), `pms_provider` (labels in stored order; none → last), `properties` (the serializer's `real_properties` count) |
| `app/queries/accessible_communities_query.rb` | `SORTS`: `name`, `company`, `data_provider` (label; none → last), `status` (lifecycle rank: Installed 1 → Activated → In Production → Final Approval → Released 5, same precedence as `PropertySerializer#stage`) |

Both queries are used only by the Connect JSON actions (`companies#index.json`, `communities#index.json`, `communities#edit.json` without params); the legacy HTML pages still use `alphabetical_sort`. No schema, migration, model, business rule, authorization or write changed.

### Frontend

- **Inventory on demand.** `loadPropertyInventory(cookie, id, { units })` (the Inventory route passes `units: tab === 'units'`; Map, Tour Setup and Unit Detail keep the default `true`); `loadInventoryUnits` + route handler `app/api/properties/[propId]/inventory/units/route.ts` (GET, same session, scope and parser; 401 / 404 / 502 like `wayfinding-route`), `APP_API.inventoryUnits`. Model: `InventoryUnitListing`, `PropertyInventory.unitsLoaded` / `unitCount`; parser reads `meta.unitCount`. `usePropertyInventory` holds the inventory in state, loads units when the Units tab or a unit-dependent dialog (`dialogNeedsUnits`: every dialog but the floor plan form, because the floorplate and amenity Building lists include unit buildings) first needs them, joins an in-flight request, sends a 401 to Sign In, and leaves a failure to Retry. The Units tab shows the shared `LoadingIndicator` ("Loading units…") or the error with Retry (`UnitsPending`); a dialog waiting for units opens at once with the same state (`UnitsPendingDialog`). The screen is keyed by property id so state never leaks between properties. Tab badge: `unitsLoaded ? units.length : unitCount`.
- **Sorting.** `core/utils/generator/listingSort.ts` (shared: `parseListingSort`, `nextListingSort` (new column → asc; asc → desc → default), `listingSortParams`, `sortStateOf`, `ariaSortOf`, `sortByLabel`); `ColumnDescriptor.sortKey`; `CustomTable` renders a sortable header as a button with `SortIcon` (new in `atoms/Icons.tsx`: both chevrons faint = unsorted, up = ascending, down = descending) and `aria-sort`; `ResourceListingTemplate` passes `sort` / `onSort`. The pages read `sort` / `dir` from the URL, validate them against `COMPANY_SORTABLE` / `PROPERTY_SORTABLE`, send them to the CMS and pass them down; the hooks' `toggleSort` writes the next state to the URL (page reset to 1; search and filters kept; paging keeps the sort). Not sortable: Go To (buttons), Products (a set of tags).
- **Map & Plotting.** `generateBuildingPills` shows a one-building property's pill, selected; the screen ignores a click on the active pill.

### Map & Plotting against `pyn-system-plotting.html` (unchanged since Sep 26)

Driven side by side (prototype from `file://` → Properties → Luxe Mile High → MAP, also its Manual Plot on and a No SVG floor; Connect on 1411, 1468 and 1618).

**Decision (asked, Sep 30):** the brief's §13–15 listed Grid, Floor SVG / Background image, Publish, the Pathways & pins tools and the floor plan bar; the design has none of them. The user chose **match the design exactly**.

- **Now on screen, as the design:** breadcrumb, title, subtitle, Inventory / Tour Setup; the Building row with counts (also for a one-building property: its pill, selected; a click on the active pill does nothing); the horizontal floorplate strip ("Single floor" / "Named floor", name, progress bar, "Done" / "n/m" / "No SVG · n/m", arrows, "N floorplates · Add Floorplate" last); "{building} · {floor}  n of m plotted" with **Auto Plot** (menu → the four-step wizard) and **Manual Plot** (Off / On, with the dark "Manual Plot is on … Turn Off" bar); the canvas (the floor SVG with its polygons and polygon popover, or the floor image, inset 24 px on white); the no-SVG drop zone ("Drop the floor .svg here", "Plotting needs the floor SVG for {floor}…", Choose SVG File); the one side panel, Plot Units & Amenities.
- **Removed from the screen:** the read-only banner; Grid; the Floor SVG / Background image switch (a floor with both files shows the SVG, the design's plotting surface; the SVG-failed state still offers "Show background image"); Publish and its dialog; the Pathways & pins strip (Select, Place Pin, Junction, Connect, Move, Start Plotting Hallways, the hint); the plan bar (file names, pins / nodes, Upload SVG / Image, Drop target, Remove Plan); the image-only note under the canvas; the side panels Auto Plot report, selected pin, Selection, Building Starting Points, Vertical Connections, Run Algorithm, Marker Colors by Bedroom; "Upload Image Instead" and the file-format note in the drop zone; 45 CSS rules no element uses any more.
- **Still drawn on the canvas (stored data, read-only):** unit and amenity pins, the stored hallway nodes, elevators, entry points and their links. They cannot be edited here any more.
- **Behaviour kept:** Manual Plot onto polygons (ticked items) and onto a floor image (turning it on arms the next item to plot; a click drops its pin), Unplot from the polygon popover and the Plotted tab, Auto Plot, Add Floorplate (the inventory dialog), deep links from Tour Setup. Everything stays local; the only request the screen sends is the floor SVG read.
- **Not removed yet:** the hook's pathway, route, grid and publish state and actions (`usePropertyMap`) and the `wayfinding-route` handler, now unreachable from the UI; left for a separate cleanup so this change stays reviewable (and restorable).

### Tests

`tests/e2e/listingsAndInventory.spec.ts` (new, 8 tests, real data, expected values read from the CMS JSON at run time, every test asserts 0 non-GET requests and 0 page errors):

- Properties listing requests nothing of the inventory (no `/api/properties/*`, no non-prefetch inventory / map / tour / unit navigation)
- Inventory opens without units, the badge already shows the CMS count, Floorplans / Amenities don't load units, the Units tab loads them once (200, 25 cards), revisiting reuses them
- `?tab=units` arrives with units and makes no extra request
- Edit floorplate on the Floorplates tab shows "Loading units…" in the dialog until the (held) response arrives, then the form; one request
- A 502 shows the error; Retry loads the units (2 requests)
- Companies: all four headers start `aria-sort="none"`; Properties asc / desc / default equal the CMS's own sorted rows and are numerically ordered; switching to Company resets Properties; Company desc page 2 equals the CMS page 2
- Properties: Go To / Products not sortable; Status asc starts Installed, desc starts Released; Data Provider asc and desc both end with "Not connected" on the last page; search keeps the sort
- Hazel map: one Building pill, selected, count = floorplates; clicking it keeps Floor 5

`mapPlotting.spec.ts` now holds the screen to the design (`expectDesignLayout`: the toolbar's buttons are exactly Auto Plot and Manual Plot, one side panel, none of the removed controls); its image-floor test checks the stored pins and hallway nodes and a Manual Plot drop on the image with Turn Off. `hazel.spec.ts`'s strip test compares the canvas pins with the Plot panel's Plotted count instead of the removed plan bar.

Floor-strip navigation (first / next / previous / last, 3 / 19 / 31 plates, deep links near the middle and end, selected floor in view) is covered by `hazel.spec.ts` since §23 and still passes. `hazel.spec.ts` "Loading" now slows the Map & Plotting route instead of Inventory: the Inventory's server render is now ~60 ms, too short to observe the veil after a pre-first-byte delay (the indicator itself is unchanged).

Server-side sort checked separately over **every page** of both listings (217 companies, 802 properties) for all 8 columns in both directions: values ordered, empties last, same row set as the default; an unknown `sort` or `dir` returns the default order.

**Results (Sep 30):** `tsc` clean; `next build` ✅ (map route 23.4 → 20.9 kB); new spec 8 / 8; full suite (`npm run test:e2e` with the session env) **107 passed** in 1.8 min, after the Map & Plotting change too (run against an isolated CMS on :3100 and Connect dev on :3005, because the user's own servers on :3000 / :3001 run on `pynwheel_prod`). Legacy HTML `/companies`, `/communities/1411/floorplates`, `/communities/1618/floorplates` 200; no 500 in the CMS log today.

### Additional performance issues found

| Issue | Status |
|---|---|
| Inventory shipped the full units listing on every tab | **Fixed** (above) |
| Production prefetch of every Go To link and sidebar route on the Properties listing (~20 RSC requests) | **Not an actual issue**: they stop at the `loading.tsx` boundary and make no CMS read (Rails log), ~0–12 KB each |
| Unit Detail loads all four listings to show one unit (there is no single-unit endpoint) and ships them to the client | **Deferred**: its Edit Unit dialog's Building and lock lists derive from the other units and the floorplates; trimming it needs a single-unit JSON read |
| Map & Plotting / Tour Setup load the whole inventory (313 KB / 612 KB RSC for 1411 / Hazel) | **Not an actual issue**: every listing is read there (pins and the strip's progress need every unit and amenity, the bedroom marker colours need the floor plans); loaded only when the screen opens |
| Duplicate requests | **None found** in any flow measured |
| Heroku timings | **Not measured** from this machine; see the note under Measurements |

### Remaining

- Commit (no AI attribution) and PR to `main`. Deploy both apps (Rails: the floorplates meta and the two queries + `ListingSort`; Connect: everything else).
- Unit Detail payload (deferred above).
- Remove the pathway / route / grid / publish logic `usePropertyMap` keeps without a UI, and the `wayfinding-route` handler, if those tools are not coming back.

---

## 25. Phase 2l: Map & Plotting — Manual Plot states, zoom, legacy markers and SVG labels (October 1, 2026)

**Brief:** `ploting_map_improvments.md` (untracked, like the other briefs). Fix the Manual Plot ON + hover state; add Zoom In / Zoom Out / Reset to the map; render the map the way the old plotting page does (yellow location markers, green plus markers, pathway lines, the SVG's own labels, no debug ids or coordinates); validate on John Demo → Floor 3 ("Tenant lease space").

**Branch:** `feature/map_zoom_labels_pins`, from `feature/plotting_sorting_inventory_perf` (`5ab58783d`, pushed).

### Implementation map

| Issue | Current behaviour (reproduced) | Old system behaviour (traced) | Root cause | Change | Reused |
|---|---|---|---|---|---|
| Manual Plot ON + hover | Measured in Chrome: ON = `bg rgb(0,119,174)`, `color #fff`; ON + hover = `bg rgb(0,119,174)`, **`color rgb(0,119,174)`** — the text vanished | The design (`mpBtnBg/Color/Border` in the plotting prototype) has one ON look and no hover; the legacy page has no such control | `.bo-map__tool:hover:not(.bo-map__tool--active)` (specificity 0,3,0) outranked `.bo-map__tool--fill:hover` (0,2,0), so the OFF-hover text colour was applied over the ON background | OFF hover never applies to `--fill`; ON + hover deepens the accent (`--bo-accent-deep: #005f8c`, one step of the design's accent), text stays white; `:focus-visible` ring; disabled excluded. Measured after: ON + hover `bg rgb(0,95,140)`, `color #fff` | existing `.bo-map__tool*` classes |
| Zoom | None | `plotexp.html.haml` → `services/zoomHandler.js`: timmywil **panzoom** on `.plot-image` (`minZoom 0.5`, `maxZoom 10`, wheel, drag), `shared/_zoom_control_buttons` (+ − ↻ top-right, `.zoom-controls`), `BUTTON_ZOOM_STEP = 1.3` towards the container centre, initial scale = fit into the parent (capped at 1) and centred, bounds with 10 % padding; the legacy `.reset` **reloads the page** | No viewport | A `View { scale, x, y }` in `MapCanvas` applied as `transform` on `.bo-map__plan` (everything inside — SVG, polygons, labels, pins, nodes, paths — moves as one); + / − ×1.3 about the canvas centre, wheel about the pointer (native non-passive listener, so the page does not scroll), drag-to-pan on the empty canvas in Select mode (a still click still clears the selection), limits **0.5–8 × the fitted plan**, bounds keep a tenth in view; **Reset** restores the fitted, centred plan without a reload or a request; a floor or layer change opens fitted. Floating control top-right (`.bo-map__zoom`), disabled at the limits / at default. The popover is positioned in canvas space so it does not scale | `MapCanvas`, `planRef` pointer maths (already relative to the plan's rendered box, so drops and drags stay exact under zoom) |
| Labels on a floor SVG | Overlay printed the shape's **generated id** ("Vector 2415") over every active polygon, plus coloured dots on placed polygons | `svgHandler.js`: the SVG is mounted as-is — **its own `<text>` is the labelling** (`updateSvgTextFontFamily` applies `font_settings.svg_labels_font_family`); a placed unit is the shape **cloned and filled** with the theme marker colour (`processSvgBlock`), no extra text; `getValidShapeCategory` accepts shapes under a `Units` *or* an `Amenities` layer; `isValidShape` rejects outline / label / text / icon layers. `svgAutoPlotting.js` matches the group's `<text>`. (`moveSvgTextGroupsToEnd` exists but is never called.) | `collectTargets` scoped to the `Units` layer only and named a target after its shape id | `PlotTarget.code` = the group's printed `<text>`, else the group's name, else the shape id (generated ids like `Vector_…` / `Group_…` never win over a named group); `category` per the legacy rule; the `Amenities` layer is plottable; polygons are identified by their unique `key` (several shapes can share a printed code — 1468 lit 15 shapes for 3 units before). The canvas prints an overlay only where the SVG prints nothing (the design's code, when active) or where the plotted item's name differs from the polygon's text; nothing on top of a placed polygon (the fill is the placement, as the legacy clone); the SVG's text gets the property's label font. Auto Plot matches unit polygons only | `floorSvg.ts`, `SvgPlanLayer`, `generatePolygons` |
| Markers on a floor image | Large coloured discs (bedroom palette) with bed / star icons and dark name chips; node dots with permanent labels; edges 2.5px blue | `_svg_or_image_unit_plotting.html.haml`: `fa-map-marker-alt` at the design's size (default 30px) in the **theme colour** (`property_map_color` / `*_property_map_marker_color` per theme, else `rgba(247,0,0,.61)`), the `<p class="marker">` at `(x − 13, y − 34)` so the tip sits on the point; a green `fa-plus-circle` (`#59de83`, half size) beside it when `self_tour && auto_wayfinding` and the unit has no door; doors `fa-sign-in` `#3153d2`; amenities (`_svg_or_image_amenity_plotting`) a `(size − 5)` square bordered in the amenity colour with `fa-camera-retro`; `maps.js draw_initial_hallways`: nodes `fa-dot-circle fa-lg` `#008fd4` (`#f7296a` selected), **1px black lines** between node centres (+8); the tour start `.start-point` red 25px disc; unit numbers are in the image; tooltips only, no labels | Phase 2g drew its own markers | `MapMarkers.tsx` (the glyphs as inline SVG, Font Awesome paths), sizes in image pixels so they scale with the plan; colours from a new `floorplates.json` `meta.markers`; permanent chips removed (a selected marker names itself); edges 1px black; no coordinates anywhere | `MapCanvas`, `generateLevelGraph` |
| Marker colours | App palette | Per-theme Design columns (above), `font_settings.svg_labels_font_family`, `communities.auto_wayfinding` | Not in any JSON | `Connect::MapMarkers` (read-only; the same branches as the two partials) → `meta.markers` on `floorplates.json`; `PropertyInventory.markers` | `FloorplatesController#render_connect_floorplates` |
| Background image not loading (1411 locally) | "The floor image could not be loaded" | Same URL on the legacy page | The local dump's 1411 (Penrose on Mass, 2021) points at `images-pynwheel-cms-v2/uploads/floorplate/image/186x/…`, which answers **403 on S3** for both the accelerate and the plain host — the objects are not public. Not a Connect data-flow bug; the legacy page fails the same way. The user's John Demo (a newer 1411 with floor SVGs, `pynwheel_prod`) was not reachable from here — see Validation | — | — |

### Backend (read-only JSON only)

| File | Change |
|---|---|
| `app/serializers/connect/map_markers.rb` (new) | `unit_color`, `unit_size`, `amenity_color`, `amenity_size` (the partial's `size − 5`), `door_color`, `door_plus_color`, `svg_font_family`, `auto_wayfinding`, decided exactly as the two plotting partials decide them per `theme_name` (gables / modernist "no color" → primary / futurist / expressionist / panther / legacy default) |
| `app/controllers/floorplates_controller.rb` | `render_connect_floorplates` meta gains `markers: Connect::MapMarkers.for(community)` |

Checked against the DB: 1411 (expressionist) `#dd4426` / 35, 1618 and 2919 (futurist) `#d37474` / 30, 3837 (futurist) unit `#ffd400` (the yellow of the screenshots) amenity `#1463d6`. No business logic, schema, migration, validation, authorization or write changed.

### Frontend

- `MapCanvas.tsx`: the viewport (state, wheel, pan, bounds, buttons, reset on floor change), the legacy markers by kind, the polygon-label rule, the popover in canvas space, `data-scale` / `data-testid="plan"`.
- `MapMarkers.tsx` (new): `LocationGlyph`, `PlusGlyph`, `AmenityGlyph`, `NodeGlyph`, `DoorGlyph`, `DotGlyph`, `TourStartGlyph`, `ResetViewIcon`; the legacy colours.
- `floorSvg.ts`: `PlotTarget.category`, `code` precedence (`codeOf`), `Units` + `Amenities` scopes, `GENERIC_ID`.
- `SvgPlanLayer.tsx`: `fontFamily`, `data-plotted` / `data-selected` on the shapes, hover by key.
- `mapNodes.generator.ts`: pins coloured from `markers`, `hasDoor` (units' `door_id`, the graph's doors); placements keyed by `PlotTarget.key`.
- `mapPanels.generator.ts`: `PolygonDescriptor.showCode`, `assigned` suppressed when it repeats the SVG's text; identity by key.
- `usePropertyMap.ts`: drops / hover / selection / Auto Plot keyed by `PlotTarget.key`; Auto Plot ignores amenity-layer polygons.
- Model / parser: `MapMarkers`, `meta.markers` with the legacy defaults.
- Strings: `mapPlotting.plan.zoom / zoomIn / zoomOut / resetView`.
- CSS: Manual Plot states, `--bo-accent-deep`, `.bo-map__zoom*`, `.bo-map__marker*`, `.bo-map__glyph*`; the old dot / chip rules removed.

### Coordinates and geometry

- A floor SVG's coordinate system is its `viewBox` (John Demo floor 1: `0 0 1419 938`, a 1412 × 932 raster embedded as a pattern, `Inter` text at 9 / 12 / 15). `pointer_data` is stored in viewBox units; a raster placement in image pixels. Overlays are positioned as percentages of the plan's box; the zoom transform applies to that box, so nothing drifts (verified: a pin's, a node's, an overlay label's and an SVG `<text>`'s positions relative to the plan are identical before and after zoom, pan and a viewport resize).
- Polygon centres come from `getBBox` + `getCTM` on the off-screen mount (unchanged); the overlay label sits at the centre.

### Validation (local: CMS on :3100 with `pynwheel_development`, Connect dev on :3005, headless Chrome, minted super-admin session)

- **Manual Plot** measured: OFF white / ink; OFF + hover white / accent text and border; ON accent / white; ON + hover `rgb(0,95,140)` / white; keyboard focus ring; the pill stays white.
- **Zoom** on Hazel: + → 1.300 (plan 715 → 929 px, centre unmoved, a pin's relative position `[0.161, 0.543]` before and after); 8 clicks → 8.000 and + disabled; − to 0.500 and − disabled; Reset → 1.000 at the fitted box, Reset disabled; wheel → 1.822 about the pointer, page `scrollY` unchanged; drag → +60 / +40 px; a floor switch → 1.000. 0 non-GET requests.
- **Floor image** (Hazel floor 1, 2919): amenity squares in `#d37474`, the green plus on the amenity without a door, 8 hallway dots, 10 black 1px links, the elevator, the red tour start; no chips, no coordinates.
- **Floor SVG**: 1468 fills exactly its 3 pointer shapes (15 before the key fix) and prints the three unit names (the SVG's own "47" is left as the label). **The real John Demo floor 1 file** (`uploads/floorplate/svg_image/4230/1785636792-optimized.svg`, fetched from the public bucket) served in place of a Sylo floor: its 32 `<text>` labels render; Manual Plot onto `Vector_2651` fills room **652**, prints the unit's name, the popover reads "Polygon 652"; `POOL` (amenities layer) is a polygon ("Polygon POOL"); no `Vector_` label anywhere; zoom keeps text and overlay aligned.
- `tsc` clean; `next build` ✅; Playwright: `tests/e2e/mapCanvas.spec.ts` (new, 6) + the suite, **113 passed** in 2.6 min. Every real-data test asserts 0 non-GET requests and 0 page errors.

**John Demo on the user's data (validated live, Oct 1):** the user signed in to their own Connect (`localhost:3001`, on the local `pynwheel_prod` copy) inside the app's browser pane and the screen was driven read-only there. Property 1411 has 6 floorplates, all with floor SVG + background, all "Done". **Floor 1:** the SVG mounts with its 55 own `<text>` labels ("TENANT LEASE SPACE" twice among them), 39 of 39 units filled as polygons, no generated-id label anywhere, extra names printed only where they differ from the room number (A-107, Pet Spa, Business Center, Conference Room, Mail Room, Yoga Room, Pool Lounge). **Floor 3** (the brief's case): 68 own labels — "TENANT LEASE SPACE", "STORAGE", "COURTYARD", "POOL", the road names, rooms 301–367 — **60 of 60 units filled**, only "Resort Style Pool" printed as an extra name, no `Vector_…` label. Zoom on that floor: ×1.3 twice → 1.690 (plan 532 → 899 px), Zoom out → 0.769 (409 px), Reset → 1.000 with Reset disabled; "TENANT LEASE SPACE" and the "Resort Style Pool" label stayed at the same position relative to the plan (`[0.360, 0.662]` / `[0.584, 0.398]`) at every scale. 0 non-GET requests, no page errors. The old `plotexp` page itself needs the user's CMS login and was compared through the user's screenshots (image section: yellow markers with the green plus; SVG section: the file's own text) and the traced source.

### Old-system behaviour discovered

- The legacy reset button reloads the whole page; the panzoom `initial` transform is the fit-and-centre. Connect resets the viewport only.
- The legacy scales markers with the map (they live in the panzoom container); labels are the SVG's text and scale too. Connect does the same; only the popover is kept at screen size.
- Legacy hover on a valid shape (Manual Plot on) fills it with the marker colour; a placement is a clone of the shape filled with the marker colour. Connect keeps the design's fills (`#E8F4FB` placed, `#CFE7F4` hover, accent stroke) — the design is the UI reference — and the theme colour for image markers.
- `moveSvgTextGroupsToEnd` is dead code in the legacy; no reordering is done.

### Tests

`mapCanvas.spec.ts`: Manual Plot states (OFF, OFF + hover, ON, ON + hover, keyboard focus, Enter toggles); zoom buttons (step, centre, limits, reset, floor switch resets); wheel about the pointer without page scroll, drag pan, wheel to the minimum; floor image markers (counts of unit / amenity markers, hallway nodes and links from the CMS JSON, 1px black lines, theme colours from `meta.markers`, the door plus rule, no chips / coordinates, a selected node names itself); floor SVG labels with `fixtures/floor-labels.svg` (7 texts incl. "TENANT LEASE SPACE" and artwork; nothing printed before plotting; a plotted room named by its text, never `Vector`; a room without text prints its code on hover / when plotted; `POOL` plottable, artwork not; the popover does not scale; labels and SVG text keep their relative positions through zoom, pan and a resize; a floor switch and back keeps the plotted state); a real floor SVG (1468) fills exactly its stored pointers with no marker on top. `mapPlotting.spec.ts` counts placements through `[data-plotted]`; `hazel.spec.ts` waits for the Edit Amenity form (it reads the on-demand units).

### Remaining

- John Demo floor 3 on the user's data (above).
- Access points (`fa-lock`, `#66bf60`) are not in the wayfinding JSON; not drawn.
- The legacy hover fill in the marker colour on the SVG is not reproduced (design fills kept).

---

## 26. Phase 2m: Map & Plotting — the Wayfinding mode, the Plot on Map panel and Additional Stops (October 1, 2026)

**Brief:** `Feature_wayfinding.md` (untracked). Reference UI: `wayfinding-tour-app.html` (a bundled prototype; its markup and script were unpacked to read the `mapEditor` screen, `NAV_TYPES`, `WF_TOOLS` and the `wf*` logic). Rule given with the brief: use the current backend, show the DB's real data, no business-logic change, and where the reference does not decide something, do what the current system does.

**Branch:** `feature/wayfinding_plot_on_map`, from `main` (`495469c37`).

### Investigation: KEEP / REWORK / ADD / REMOVE

| Area | Decision | Why |
|---|---|---|
| Building pills, floorplate strip, zoom / pan / reset, legacy markers, Manual Plot, Auto Plot wizard, Add Floorplate | **KEEP** | Already match the reference; untouched |
| Floorplate tab sub-line | **REWORK** | The reference reads `10 floors · stacked` / `1 floor` / `Named floor` (was `Floors 1–3` / `Single floor`); in Wayfinding the card shows path progress (Complete / Incomplete / Not started / No image) |
| Plot Units & Amenities panel | **REWORK → "Plot on Map"** | Title, `{building} · {range} · n of m plotted`, Add Stop, the stacked **Floor** select ("All N floors · shared stops only" + each floor), the **Show** menu (Units / Amenities / Additional Stops, with "N to plot" / "All plotted" / "None here" badges and the pending pill), "Search name or floor", stops in both lists |
| Toolbar | **ADD** Plotting / Wayfinding switch; in Wayfinding: Detect Paths ▾ (this floorplate / building / all), Move · Connect · Add Point · Erase with the reference's tooltips, Clear Paths | The reference's two modes on one toolbar |
| Side panel | **ADD** Wayfinding panel (status pill, stacked floor section, Points / Paths / Stops Linked, tool hint, selection card, Detect review, Test shortest path, Not linked list) | Reference `mpModeWf` panel |
| Canvas | **ADD** a Wayfinding layer inside the existing plan (paths, points, stop links, stop markers, blocker zones, route, animated walker, Deselect badge) | No second renderer: the same `MapCanvas`, viewport and plan box |
| Additional Stop dialog | **ADD** | Reference "ADDITIONAL STOP MODAL", with validation |
| Pathway tools of phase 2g (Junction / Connect / Start Plotting Hallways, Run Algorithm) | **KEEP removed** (§24); their state (`tempNodes`, `tempEdges`, `nodeOverrides`, `hidden*`) is now what the Wayfinding tools write | Reused rather than duplicated |
| Fake prototype geometry (`platePolys`, `wfDetect` corridor) | **REMOVE / not ported** | Replaced by the stored hallways and real positions |

### DB → Controller → JSON → Serialization → React

| Data | Table / column | Controller → JSON (existing, unchanged) | Parser → model | Used by |
|---|---|---|---|---|
| Floorplates and their **Range** | `floorplates.range` → `Floorplate#floors` | `FloorplatesController#index` → `floorplates.json` `floors` | `inventory.parser` → `InventoryFloorplate.floors` | `generateMapLevels` (`floors`, `rangeLabel`, `stackLabel`), `isStacked`, `stackFloor` |
| Hallway points / paths | `hallways.x_plot/y_plot/next_points/parent_*` | `AutomatePlottingController#index` → `automate_plotting.json` `hallways` | `wayfinding.parser` → `MapHallway` | `generateLevelGraph` → `wayfindingPlate().points/paths` |
| Elevators | `elevators.*`, `floorplate_covering_range` → `Elevator#floors` | same JSON `elevators` | `MapElevator` | stops (type Elevator), vertical links |
| Entry / exit | `building_starting_points` | same JSON | `MapStartingPoint` | stops (type Entry Point), building links |
| Tour start | `tours.x_plot/y_plot/starting_floor` | same JSON `tour` | `MapTour` | stop (Entry Point) |
| Doors / access points | `doors.*` | same JSON `doors` | `MapDoor` | unit / amenity attach point; floorplate access points as Door / Gate stops |
| Units / amenities | `units.*`, `amenities.*` | `units.json`, `amenities.json` | `InventoryUnit`, `InventoryAmenity` | anchors (with `floor` for stacks), Plot on Map |
| Self-tour gate | `communities.self_tour`, `auto_wayfinding` | `automate_plotting.json` `settings` | `WayfindingSettings` | `wayfindingEnabled` |

**Backend changes: none.** Every field was already exposed by the phase 2g / 2i JSON branches. No controller, serializer, route, schema, migration, validation or authorization was touched.

### Decisions where the reference is silent (defaulted to the current system)

| Question | Decision | Source |
|---|---|---|
| When is the toggle shown? | `self_tour && auto_wayfinding` (the CMS's Auto Wayfinding menu gate); the reference shows it with the Self-Guided Tour product | `_side_menu.html.haml` |
| Which plan does Wayfinding draw on? | The **floor image**: the CMS stores hallways, elevators, entry points and doors in its pixels; the floor SVG does not share its frame (1468, 2934). A floor with only an SVG shows "No image" and offers no point tools | `plotexp` image section, `maps.js` |
| How does a stop join the paths? | Its **nearest hallway point**, no distance limit — `ShortestPath#get_unit_data / get_elevator_data / get_starting_point_data`; a unit or amenity at its door when it has one (also when it is plotted on the SVG only). "Linked" = that point has a path. Connect can link a stop to a chosen point on the page | `app/helpers/shortest_path.rb` |
| Stacked floors | One level per floorplate (the CMS keys maps by floorplate). Paths shared; a unit belongs to `units.floor`, an entry point to its `floor`, an elevator to the floors of its range (all floors of the stack → shared), an amenity / access point without a floor to all | `Floorplate#floors`, `Elevator#floors` |
| Which elevators / entries belong to a floorplate of a multi-building property | Floor overlap, as `fetch_elevators(floor)`; a record named for **another floorplate's building** is that building's (`fetch_elevator_according_to_building`) | `Floorplate#fetch_elevators`, `ShortestPath` multi-building pass |
| Route length | Floor-image pixels ("{px} px along the plan"), as Tour Setup's route already prints; no feet / minutes (no scale stored) | gap T3 |
| Stop types without a table | Temporary only (Stairs, Ramp, Blocker, Leasing Office, Restroom, Mail & Packages, Parking Access, Waypoint, Exit Point; new Entry / Elevator / Door also temporary) | gap M15 |
| Where stops are placed | On the floor image (raster), like every stored stop; arming a stop while the plan shows an SVG switches to Wayfinding | — |
| Default "Show" | Units only (reference) | reference `plotShow` |

### Frontend

**New**
- `utils/wayfinding/stopTypes.ts` — the 12 stop types (label, hint, example, colour, glyph, vertical / gate / block).
- `utils/wayfinding/wayfindingGraph.ts` — `wayfindingPlate` (points, paths, stops, anchors, blockers per floorplate), `levelStops`, `anchorsOnFloor`, `plateProgress`, `parseServedFloors`, blocker radius.
- `utils/wayfinding/wayfindingRoute.ts` — floor copies of a stack (`levelId@floor`), scopes, From / To groups ("Floor 5 (shares Floors 5–14)"), default pair, Dijkstra (binary heap) with elevator / stairs / outdoor links, blockers, step-free, the reference's error messages and fixes, steps and summary, `sampleRoute`.
- `utils/wayfinding/detectPaths.ts` — the browser detection (below).
- `utils/generator/map/wayfinding.generator.ts` — toolbar, panel, picker, canvas layer and stop-form descriptors; stop-form validation.
- `hooks/useMapWayfinding.ts` — every Wayfinding / stop action over the screen's one `LocalMapState`.
- `screens/properties/map/WayfindingPanel.tsx`, `WayfindingToolbar.tsx` (+ `ModeSwitch`), `WayfindingLayer.tsx` (+ `RouteDot`), `AddStopDialog.tsx`.
- Tests: `tests/e2e/wayfindingLogic.spec.ts` (14), `tests/e2e/wayfinding.spec.ts` (8, real data).

**Changed**
- `mapState.ts` — `mode`, `plotShow`, `plotShowOpen`, `plotFloor`, `stopTarget`, `selStop`, `tempStops`, `stopDialog`, `wf*` (tool, selection, floor, links, edited, review, scope, From / To, step-free, route, picker, animation).
- `mapLevels.generator.ts` — `rangeLabel`, `stackLabel`, `floorsText`, `isStacked`, `stackFloor`; `activeSpace` returns the image in Wayfinding.
- `mapPanels.generator.ts` — `generatePlotPanel` (Show, floor filter, stop rows, new labels), `generateLevelTabs` (stack line, Wayfinding progress).
- `usePropertyMap.ts` — composes `useMapWayfinding`; surface clicks, drags, unplot and level / building changes route to it; stops placed by click.
- `MapCanvas.tsx` — the Wayfinding layer, the floor-in-view's pins on a stack, temporary stops while plotting, the stop popover (Edit / Move / Unplot / Remove), panning in Wayfinding.
- `MapPanels.tsx`, `propertyMap.screen.tsx`, `MapDialogs.tsx`; strings (`mapPlotting.show`, `.stops`, `.wayfinding`, 300 keys) and `globals.css` (`.bo-map__show*`, `.bo-map__addstop`, `.bo-wf*`).
- Tests updated for the reference's wording: `hazel.spec.ts` (`1 floor`, unit pins vs the Units list), `mapPlotting.spec.ts` (`Plot on Map`).

### Components reused / new

Reused: `MapCanvas` (viewport, plan box, pointer maths), `generateLevelGraph` (the stored graph with the page's overrides), `LocalMapState`'s pathway fields, `Modal`, `StatusPill`, `ConfirmDialog` path (`state.confirm`), the toast, `.bo-map__apmenu*` menus, `.bo-map__tick`, `.bo-map__plotrow`, `.bo-map__polypop` (stop popover), `.bo-tour__dialog` dialog layout, `levelsOfBuilding`, `placementOfUnit / Amenity`, `planAssets`. New components exist only where nothing similar existed: the Wayfinding panel, toolbar and switch, the layer (the legacy node glyphs do not express selection / route / lonely states), the walker animation, and the stop dialog (the inventory dialogs are other forms).

### Detect Paths (browser only)

The CMS has no hallway detection (hallways are drawn by hand on the Auto Wayfinding page) and the floor image carries no corridor data, so detection works from what each floor has in the image's frame: where its doors, units, amenities and stops are plotted. A spine runs along the floor's long axis, across it in the widest gap between rows of stops (a double-loaded corridor) or on the row itself, with a point opposite each stop; every stop then joins its own point. Stored points are hidden on the page, the proposal is added as temporary points and paths, a review card says what was detected or skipped (no image / already has paths / fewer than two stops) and offers **Undo**. Several floorplates at once skip those that already have paths. Nothing is saved (gap M16).

### Validation (local: CMS :3100 on `pynwheel_development`, Connect dev :3005 from an rsync'd copy, headless Chrome, minted super-admin session)

- **Stacked, Oeuvre at the Square (1839)**, floorplate 2364 `range 1-6`: one card "6 floors · stacked / Floors 1–6"; panel "1 · Floors 1–6 · Complete", floors 1–6, "Hallway paths are shared by all 6 floors", "Each polygon links that floor's unit — 1-104-B on Floor 1"; **35 points / 35 paths** (the stored hallways); Stops Linked 31/31 on Floor 1, 59/59 on Floor 4, example "1-401-C on Floor 4". Floorplate `7-10` "4 floors · stacked", Not started, 0/1 — Detect reports "fewer than two stops on the floor image".
- **Routes**: This Floor sample "Elevator 1 → 1-464-A, 284 px · 7 points"; Floors sample "Tour start (Floor 1) → Elevator 2 → 1-402-C (Floor 4)", 797 px, "2 floors · 1 elevator ride", "Up 3 floors"; Play Route animates and follows the floors; the same From and To → "Pick two different places…". **Buildings, Trestle (1105)**: building 1 floor 1 → building 2 floor 3 through the stored elevator "Building 1 Stairs", 822 px.
- **Detect, Alderwood (1234) Floor 2** (117 plotted units, no hallways): 37 points, 36 paths, 119/119 linked; Undo back to 0. Add Point / chain / Erase / Connect / drag (a stored point reads "Moved on this page") / Clear Paths / Escape all local.
- **Single floor, Sofia (2919)**: counts equal the CMS JSON (nodes of the floorplate and its `next_points` links counted once).
- **Plot on Map (1839)**: Floor 3 filter → 57 of 57; search "1-30" → 9; Select all → "9 selected"; Unplot 9 → To Plot 9 / Plotted 48, map pins 286 → 277; Show → Additional Stops lists the stored elevators; Add Stop → validation (name > 80, "3-x" floors) → "Service Lift", Add & Place → armed bar → click → marker, "Elevator · On plan", popover Edit / Move / Unplot / Remove; in Wayfinding Stops Linked 32/32.
- **Responsive**: no horizontal page scroll at 900 and 390 px. Found on the way: below 1100 px the stacked layout kept `align-items: flex-start`, so the map card sized to its content (528 px in a 286 px column, zoom and tools clipped, in both modes); it now stretches.
- **Performance (Hazel, 31 floorplates)**: switching to Wayfinding ≈ 200 ms in dev; every pointermove of a drag under 16 ms (Event Timing).
- **Network audit**: every script and spec recorded **0 non-GET requests** and 0 page errors across Plot, Unplot, Move, Detect, Undo, Clear, Connect, Erase, Add Point, Add Stop, Add & Place, Remove, route, sample, animation, mode and floor switches.

### Tests

`npm run typecheck` clean. Playwright: `wayfindingLogic.spec.ts` 14/14 (Range 5-14 → one stack; shared paths and floor-specific units; the stacked panel; single floor; Floors through the elevator; no vertical link; stairs and Step-free; a blocker cutting a hallway; Buildings via entry points and the invalid same-place route; a floorplate with no paths; Detect; Plot on Map Show / floor; the stop form's validation; the toggle gate); `wayfinding.spec.ts` 8/8 on real data (toggle and one canvas; single floor counts, drag, Escape, path selection; stacked range / floors / shared paths; routes, sample, swap, picker, animation, invalid; Detect / Undo / Add Point / Clear; Plot on Map search / select all / unplot / Show; Additional Stops dialog, validation, Cancel / × / Escape, Add & Place, Remove; Buildings). Regression with them: `mapPlotting`, `mapCanvas`, `hazel`, `tourSetup` — 45/45 after the two wording updates; `listingsAndInventory`, `amenities`, `routes`, `screens`, `interactions` — 90/90. `next build` ✅ (map route 36.4 kB).

### Remaining

Backend persistence and the things the CMS's data cannot express are in `gaps_map_plotting_feature.md` (M14–M19) and `gaps_tour_setup_feature.md` (T8).

---

## 27. Phase 2n: Map & Plotting — Detect Hallways, Auto-Connect Paths, the POC's editing and shortest path (October 1, 2026)

**Brief:** `POC_auto_plot_impmemnted.md` (untracked). Reference implementation: the POC at `/Users/zubairzulifqar/sample_pyn_wheel_map` (`CONTEXT.md`, `FEATURES.md`). Rule: the POC gives the algorithm, the CMS gives the data, the new UI gives the design; the database stays read-only.

**Branch:** `feature/wayfinding_detect_hallways_auto_connect`, from `feature/wayfinding_plot_on_map` (`3ccba184a`).

### Investigation and the two decisions taken with the user

- **No CMS floor SVG has a walkway layer.** The POC detects hallways only from a labelled `Walkway` / `Hallway` / `Corridor` / `Sidewalk` layer. Every distinct floor and sitemap SVG design in the local database (18 files covering every design) has `Units`, `Amenities`, `Footprints`, `Outlines`, `Streets`, `Stairs_Elevators`… and none. The user chose **port the POC faithfully and add corridor inference** (the POC's unbuilt "Phase 1B") for files without the layer.
- **The floor SVG and the floor image do not share a frame** (least-squares fit of units placed in both: 300–600 px error on 6 of 7 floorplates). The user chose **the SVG layer**: a floorplate whose hallways come from its SVG is shown and edited on the SVG.
- The SVGs hold **every floor of a building**, hiding the others with `display="none"`; building outlines sit **inside** `Units` (`Units/A-4/Outlines`); ids are Illustrator-escaped (`AMENITIES__x28_other_x29_`, `Units_000…_`).
- **Stored SVG pointers can be off their polygon**: Sylo Floor 0's ten pointers name rects centred at x ≈ 989 but store `x_plot` 759 (gap M22).

### POC → Connect mapping

| POC (`sample_pyn_wheel_map`) | Connect | Notes |
|---|---|---|
| `lib/wayfinding/detectLayers.ts` | `utils/wayfinding/hallways/svg/detectLayers.ts` | Same keywords and exact-base-id match; ids decoded first (`_xHH_`, `_000…_`); hidden subtrees skipped; adds Footprints / rooms layers for inference |
| `svg/matrix.ts`, `shapeGeometry.ts`, `flattenShapes.ts` | `svg/matrix.ts`, `svg/shapes.ts` | Verbatim logic; runs on a plain element tree (`svg/svgTree.ts`: DOMParser in the browser, `tests/e2e/helpers/svgTree.ts` in Node) |
| `svg/parsePathData.ts` (`svg-pathdata`, `svg-path-properties`) | `svg/pathData.ts` | Own M/L/H/V/C/S/Q/T/A/Z normaliser (arcs → ≤ 90° cubics, compact flags) and arc-length sampling — no new dependency |
| `rbush` | `hallways/spatialIndex.ts` | Same `search(box)` contract on a uniform grid |
| `graph/buildGraph.ts`, `crossings.ts`, `cluster.ts`, `simplify.ts`, `splitEdge.ts`, `geometry.ts` | same names under `hallways/` | Verbatim |
| `graph/bridgeGaps.ts` | `hallways/bridgeGaps.ts` | Verbatim |
| `graph/autoConnect.ts`, `obstacles.ts` | `hallways/autoConnect.ts`, `obstacles.ts` | Verbatim (k = 3, range max(60, 8% diag), redundancy 3×, rescue); `connectNodeToNearest` = full pass, edges touching the node kept |
| `stops/snapStops.ts` | `hallways/snapStops.ts` | Verbatim (edge split); stops = the floor's plotted units / amenities / placed stops, aimed at their polygon centres |
| `wayfinding/editing.ts` | `hallways/editing.ts` | `moveNode` (confirms), `deleteNode` (chain rejoin), `addNode`, `deleteEdge`, `rerouteEdge`, `confirmNodesAboveConfidence` |
| `routing/astar.ts`, `componentGap.ts`, `computeRoute.ts` | `hallways/astar.ts` + `utils/wayfinding/wayfindingRoute.ts` | A* (heuristic within one floor; off across floors, where it would not be admissible), polyline stitching, route-time bridge ≤ max(50, 2% diag) with a warning |
| Phase 1B (not built in the POC) | `hallways/inferCorridors.ts` | New: footprints − rooms on a grid (≤ 900 cells on the long side), opening by the narrowest corridor half-width, small pieces dropped, Zhang–Suen thinning, spur pruning, tracing to polylines with a confidence per run |
| `extract.ts` | `hallways/extract.ts` (`detectHallways`, `obstaclesOf`) | Orchestrates either path, then stop snapping, Auto-Connect, parallel-edge split; loaded on demand (`hallways/floorEngine.ts`) |
| `state/MapProvider.tsx` (`commit`, `undo`, edit actions) | `hooks/useMapWayfinding.ts` + `utils/wayfinding/hallwayEdits.ts` | The POC's ops run on the floorplate's graph; `graphPatch` writes the difference as the page's overrides; `wfUndo` (50) is the history |
| `components/GraphEditorLayer.tsx` gestures | `WayfindingLayer.tsx` + `usePropertyMap` surface handlers | Drag, double-click, click-add, bend (4 px slop, preview), with no tool on |
| Save Map, My Maps, Upload, Auto-Plot Nodes, IndexedDB | not ported | Out of scope by the brief |

**Parity:** on the POC's real exports, with the POC's own functions and with the port, the graph build, gap bridging and Auto-Connect counts are identical — 77 N Camino Seco 227/229 → 227/233 (4 bridges) → 16 drawn / 210 blocked / 92 redundant; 10700 N La Reserve 354/360 → 357/370 (7) → 12 / 150 / 335; Floor_3_withBG 500/424 → 516/518 (78) → 154 / 250 / 322; 0 isolated on all (held in `tests/e2e/hallways.spec.ts` when the POC folder is present).

### DB → Controller → JSON → Parser → React

| Data | Source | Path into Connect (unchanged) |
|---|---|---|
| Floor SVG text | `floorplates.svg_image` (S3) | `floorplates.json` `svg` → `/api/properties/:id/plan-svg?floorplate=` (GET proxy) → `parseSvgTree` |
| Stored hallways | `hallways` | `automate_plotting.json` → `wayfinding.parser` → `generateLevelGraph` |
| Unit / amenity polygons | `units.pointer_data`, `amenities.pointer_data` | `units.json` / `amenities.json` `svg_pointer` → `elementCentres` (by element id / selector) |
| Elevators, entries, doors, tour start | as phase 2m | image-space only (gap M20) |

**Backend changes: none.** No controller, serializer, route, schema or migration was touched; the only requests the feature adds are GETs of floor SVGs through the existing `plan-svg` route.

### Behaviour

- **Detect Hallways ▾** — "Detect hallways on": *This floorplate* (`1 · Floor 1`), *All floorplates in {building}* (when the building is a subset), *All floorplates* (`31 floorplates`), counts from the real levels. A run goes floorplate by floorplate (progress bar, the one being read, chips for processed / detected / existing paths / no SVG / no hallway / failed, one row per floorplate with its reason) and can be stopped. **More than one floorplate: any floorplate with paths (stored, or added on this page) is skipped — "Skipped — existing paths · already has N stored hallway points — not overwritten".** This floorplate alone asks before replacing (the stored points are hidden on the page, Undo brings them back). No SVG → "Skipped — no SVG"; unreadable / empty → "Invalid SVG"; nothing traced or inferred → "No hallway found" with the reason; all skipped → "Nothing to detect". One Undo (card, toolbar or Ctrl/Cmd+Z) takes the whole run back.
- **Frame:** `wayfindingSpace(level, state)` — the floor image, or the floor SVG when hallways were detected from it here (`wfSvg`) or the level has only an SVG. `generateWayfindingGraphs` builds each level on its own layer; anchors on the SVG sit at their polygon centres; stored image-only records are not placed there (M20).
- **Auto-Connect Paths** (toolbar): the POC's pass on the floorplate in view, obstacles = the SVG's rooms / footprints (or its obstacle layers); toast with drawn / blocked / redundant counts; undoable; runs as part of every detection too.
- **Editing.** No tool is on by default (`wfTool: null`; "Editing — no tool selected" in the panel, crosshair cursor): drag a point (moves; an inferred point becomes reviewed), double-click a point (POC `deleteNode`, chain rejoin), click the plan (POC `addNode` + `connectNodeToNearest`), drag a path (POC `rerouteEdge` + auto-connect, live preview), double-click a path (only that path), Ctrl/Cmd+Z (not while typing or in a dialog). Each tool button toggles; with Move / Connect / Add Point / Erase on, only that tool's behaviour applies (a double-click deletes nothing, a click adds nothing unless Add Point). Every tool edit, Clear Paths and link is undoable too; undo restores the graph fields only (not floor, dialogs, search, filters).
- **Review:** inferred points are pending (dashed red, faded by confidence); "Confirm N above 0.9"; a route over pending points shows "This route uses N inferred point(s) not reviewed yet" (the POC refuses such routes — the brief wants them testable; gap M21).
- **Shortest path:** paths weigh their polyline length; the route line follows each polyline; lengths say px (image) or SVG units; the POC's route-time bridge warns "crosses an unmapped N-unit gap"; scopes, elevators, stairs, outdoor links, blockers and step-free are phase 2m's rules on top.

### Validation (local: CMS :3100 on `pynwheel_development`, Connect dev :3005 from an rsync'd copy, headless Chrome, minted super-admin session)

- **Sylo (3837), All floorplates** (5 SVG floorplates, Floor 4 with 15 stored hallways): Floors 0–3 detected by inference — Floor 0 105 points / 106 paths, Floor 1 47 / 43, Floor 2 106 / 104, Floor 3 112 / 110 (370 / 363); Floor 4 "Skipped — existing paths · already has 15 stored hallway points"; ≈ 6 s including the four SVG GETs (≈ 250 ms of geometry per floor). Floor 0: 10/10 units linked at their polygons A152–A170. Undo → every detected floor back to 0 / 0.
- **Sylo Floor 4, This floorplate:** confirm → 107 / 100, **91/91** units linked on the SVG; Undo → the stored 15 / 14, 13/91 on the image.
- **Gestures on Floor 0:** drag (moved, reviewed; Ctrl+Z restores position and pending state), double-click point (104 / 105, undo), click plan (+1 point linked), bend (+1 point, +2 paths, preview shown), double-click path (only that path), Move on (no delete, no add), Auto-Connect ("13 blocked, 127 redundant" — nothing to add after detection).
- **Routes:** Floor 0 A-A152 → A-A154 along the corridor, 73 SVG units, warning for 2 pending points; Floors scope A-A152 (Floor 0) → Elevator A → Floor 1 with an Elevator stop added on each SVG floor: "145 SVG units · 2 floors · 1 elevator ride"; Floor 4's stored graph still routes (391 px sample).
- **Hazel (1618), All floorplates:** "All floorplates · 31 floorplates", all 31 skipped as existing in 2.6 s, no SVG fetched. **Alderwood (1234):** "Skipped — no SVG", "Nothing to detect".
- **Read-only:** every script and spec recorded **0 non-GET requests** and 0 page errors. **Responsive:** no horizontal scroll at 1440 / 900 / 390 px.
- **Bundle:** map route 43.1 kB (36.4 kB before; the SVG engine is a separate chunk loaded when Detect Hallways runs).

### Tests

`npm run typecheck` clean; `next build` ✅. `tests/e2e/hallways.spec.ts` (new, 26, no server): path data, transforms, Illustrator ids and hidden floors, polygon centres, unreadable files; walkway tracing with crossings / stop splits / obstacles; gap bridging; corridor inference on a CMS-shaped floor; no layer / no corridor; short islands; the POC's real exports at the POC's numbers; move / delete-rejoin / add + connect / bend / delete path / confirm / Auto-Connect; local overrides and undo; routes on polylines, the gap bridge, the pending warning, invalid ends. `wayfindingLogic.spec.ts` 13/13 (the old Detect Paths test removed with `detectPaths.ts`). `wayfinding.spec.ts` 10/10 on real data (new: Detect Hallways · All floorplates with the skip rules and Undo; default editing gestures, Ctrl/Cmd+Z and the Move override; shortest path on a detected floor and the no-SVG floorplate). Regression: `mapPlotting`, `mapCanvas`, `hazel`, `tourSetup`, `wayfinding*`, `hallways` 72/72; `listingsAndInventory`, `amenities`, `routes`, `screens`, `interactions` 90/90.

### Limitations

Inference is a proposal (pending review): it reads footprints minus rooms, so a building drawn without a `Footprints` layer gets no corridors, garden-style buildings with outside access get none (correctly), and doors are not modelled (a unit joins the corridor at its polygon's nearest point). Detected graphs live on the SVG and cannot show the stored image-only elevators / entries (M20). Nothing is kept across a reload (M14, M21). `connectNodeToNearest` runs a whole-graph pass per new point, as in the POC. The detection runs on the main thread, one floorplate per frame.

### Remaining

Gaps M14, M16 (updated), M20–M23 in `gaps_map_plotting_feature.md`.

## 28. Phase 2o: Map & Plotting — stored hallways kept by Detect Hallways, Auto-Connect folded in, editable bridges, hollow markers; favicon and profile (October 2, 2026)

**Brief:** `POC_auto_plot_impmemnted_issues.md` (untracked). **Branch:** `improvement/wayfinding_hallway_persistence_markers`, from `feature/wayfinding_detect_hallways_auto_connect` (`0c20d57d7`). Rule unchanged: the database stays read-only; every change here is page state.

### Root cause of the DB hallway overwrite (brief §5)

Three things, all in the Detect Hallways path, none a visual matter:

1. **`detectionPatch` cleared before it added.** `hallwayEdits.detectionPatch` diffed the floorplate's graph against an *empty* graph first (`graphPatch(old → {})`), which wrote every stored hallway point into `hiddenNodes` and every stored link into `hiddenEdges`, then added the detected graph. On the page the stored mapping vanished and the detector's output stood in its place.
2. **"This floorplate" offered to replace.** `runDetect` asked "Replace paths on {level}?" and, on confirm, ran `detectOne(…, replace = true)`, which skipped the "already has paths" guard and fed the floorplate into step 1. The multi-floorplate scopes skipped such floorplates; the single-floorplate scope did not.
3. **The layer switch hid what was left.** After a run `wfSvg[level] = true` moves the floorplate's Wayfinding onto its SVG, where stored image-space hallways are not placed at all (gap M20), so even the points step 1 had not hidden were no longer visible.

Nothing was ever sent to the CMS — the audit of every run still shows 0 non-GET requests — but on the page the stored mapping was replaced, which is what the brief forbids.

### What changed

| Area | Change |
|---|---|
| `utils/wayfinding/hallwayEdits.ts` | `detectionPatch` is additive: it diffs the floorplate's graph against *itself plus* the engine's result, so a run never writes `hiddenNodes`, `hiddenEdges` or `nodeOverrides`. Hand-made links to stops the engine did not join are kept |
| `hooks/useMapWayfinding.ts` | `detectOne(level)` (no `replace`): a floorplate with points — stored `h:` or page `j:` — keeps every one and only runs the POC's `autoConnectNodes` over them (obstacles from its SVG via `obstaclesForDetect`, cached or fetched; none on the floor image), recording the added `knn` paths through `graphPatch`; a floorplate without points is read from its SVG as before (the engine already auto-connects its result). `runDetect` has no confirmation and no replace branch; the run's Undo covers both detection and auto-connected paths (`changed`). The `autoConnect` action is gone. New: `unlinkAnchor`, `onLinkDown`, `onLinkDoubleClick`, `onAnchorDoubleClick`, `anchorAt` (polygon / marker under a click), `anchorClicked` (the former body of `onAnchorDown`: with no tool it selects the marker's bridge, Erase removes it — a unit on the corridor has a bridge too short to click, a stop's disc covers its own); every selection reset includes `wfSelLink`; Clear Paths also drops the level's `wfLinks` |
| `utils/generator/map/mapState.ts` | `wfLinks: Record<string, string \| null>` (null = bridge removed by hand); `wfSelLink` |
| `utils/wayfinding/wayfindingGraph.ts` | `WfAnchor.pin` (where the marker is drawn), `.detached`; `attach()` returns no point for a null link; `placeAnchor` computes the join point: door / pin on the image, the polygon's edge facing the attached point on the SVG (`polygonEdge`) |
| `utils/generator/map/wayfinding.generator.ts` | Toolbar without `canAutoConnect`; the panel's selection has `kind: 'link'` ("Bridge · 504 · joins its nearest point, as the CMS routes it · 64 px long"); "Not linked" rows say "bridge removed on this page"; `WfLayerLink.selected`; `WfLayerAnchor` on both layers (kind, name, linked, selected, idle, polygon); `WfLayer.pins` gone; the Detect card reads kept rows (`keptTitle`, `keptDetail`, Undo when auto-connect added paths); no Deselect badge while Connect holds a point (it covered the markers next to that point) |
| `screens/properties/map/WayfindingLayer.tsx` | Bridges are a hit line + a dashed line (`data-wf-link`, `data-linked`), select on click, Erase on click, remove on double-click; anchors are `.bo-wf__anchor` on both layers with `--unit` / `--amenity` / `--unlinked` / `--idle` / `--selected`, `data-polygon`, and double-click removes their bridge (stop markers too) |
| `screens/properties/map/MapCanvas.tsx` | Draws no unit / amenity pins in Wayfinding (the layer's markers replace the legacy glyphs there; Plotting mode is unchanged) |
| `screens/properties/map/WayfindingToolbar.tsx` | Auto-Connect Paths button removed |
| `app/globals.css` | `.bo-wf__anchor`: 10 px hollow outline, dark 1.5 px border, ring / square, dashed red when unlinked, faded when the floor has no paths, amber halo when selected, 22 px hit area; `.bo-wf__linkhit`; `.bo-topbar__user*` |
| `config/app/strings.ts`, `resources/i18n/index.ts` | `detect.replace*`, `autoConnect.*`, `toast.autoConnect*` removed; `detect.keptTitle` / `keptDetail`, `selection.bridge` / `linkedByHand` / `nearestPoint`, `unlinked.detached`, `hints.link`, `toast.bridgeRemoved` added; Detect menu note, "Existing paths kept", Clear Paths copy, Erase / Connect / default hints reworded |
| `app/icon.png` | The Pynwheel pinwheel (256 × 256 from the user's `public/logo_transparent_bg.png`, which replaced an "Ascend Properties" placeholder); Next's file convention serves it as the favicon |
| `core/session/CurrentUserProvider.tsx`, `app/(connect)/layout.tsx`, `organisms/Navbar.tsx`, `organisms/Sidebar.tsx` | The signed-in user (avatar, name, role) moves from the sidebar's foot to the top bar between Notifications and Sign out, through a client context the layout fills from `loadCurrentUser` |

**Backend changes: none.** No controller, serializer, route, schema or migration was touched.

### How the pieces behave now

- **Detect Hallways** (menu: this floorplate / its building's / all): per floorplate, *has paths* → "Existing paths kept · N stored hallway points kept — not overwritten", plus "· M paths auto-connected on this page" when Auto-Connect found a detour worth a straight link (page `knn` paths between stored points, undoable, never through the SVG's rooms or footprints); *no paths, SVG* → detected and auto-connected; *no paths, no SVG* → "Skipped — no SVG". No scope ever asks to replace, hides a stored point, moves one or writes a stored link out. Running it again adds nothing. A floorplate with stored hallways is therefore never re-read from its SVG (M20: the two files share no frame); hiding its stored points by hand first (Clear Paths, or deleting them) is the explicit way to try the SVG, and Undo reverses it.
- **Clear Paths** clears the floorplate on the page: page points, paths and bridges go, stored hallways are hidden (Undo brings them back, the CMS is untouched), links are dropped, and with no paths left the unit markers go neutral — no red dots.
- **Bridges** (the dashed line from a unit, amenity or stop to the hallway point it joins — the CMS's nearest point, or the one chosen with Connect): click selects (panel: "Bridge · … · Delete"), Erase removes, double-click with no tool removes, Delete removes; only that bridge goes, the hallway paths and the other bridges stay; the unit lands in "Not linked" ("bridge removed on this page"), its marker goes dashed red, a route to it fails ("… isn't connected to a path on Floor 5. Use Connect …"), the counts follow (57/58). A marker (unit, amenity or stop) offers the same: click selects its bridge, double-click or Erase removes it. Connect → the nearest hallway point → the unit **polygon** (or its marker) or the stop marker links it again; Ctrl/Cmd+Z undoes any of it. Elevator / stairs bridges work the same, and a cross-floor route through a detached elevator fails until it is linked again.
- **Markers in Wayfinding**: small hollow dark outlines — a ring for a unit, a square for an amenity — at the polygon's edge facing its hallway point on the SVG, on the pin on the image; dashed red only when the floor has paths and the unit joins none; faded while the floor has none. The route and the bridge meet the polygon at that edge too, so the SVG's own label in the middle stays readable. Stop markers are the design's discs, unchanged.

### Validation (CMS :3100 on `pynwheel_development`, Connect :3005 from an rsync'd copy, headless Chrome, minted super-admin session; scratchpad `verify.mjs` 73 checks, `verify-connect.mjs` 14 checks)

- **John Demo 1411** (4 image floorplates "A · Floor 2–5", 25 / 12 / 23 / 14 stored hallways, 226 plotted units, Elevator 1): counts match `automate_plotting.json` on every floor (e.g. Floor 2 25 points / 26 paths, 61/61 linked). Detect · This floorplate on Floor 5: no dialog, row "Existing paths kept · 14 stored hallway points kept", 14 → 14 points, every `h:` node still on the plan, a second run identical. Detect · All floorplates: all four "kept"; Floor 4 gained 3 auto-connected page paths (23 / 23 → 23 / 26), Ctrl+Z took them back. Bridge: select → "Bridge · 504 · joins its nearest point, as the CMS routes it · 64 px long" → Delete → 58 → 57 links, paths 15 → 15, "Not linked · 1 … 504 · bridge removed on this page", marker dashed red; Connect → point → marker → 58/58; double-click and Erase each remove one bridge, Ctrl+Z restores; Elevator 1's bridge erased through its marker → This Floor route from it "isn't connected to a path on Floor 5" → relinked through the stop marker → Floors sample route "2 floors · 1 elevator ride" again. Double-click a path (15 → 14), a stored point (14 → 13, rejoined), Ctrl+Z each. Clear Paths → 0 / 0, 57 markers all neutral, 0 red, 0 bridges; Ctrl+Z → 14 / 15. Routes: This Floor sample "506 px along the plan · 8 points", Floors sample rides the elevator, a route to a detached unit fails with the reason. Zoom ×1.69 leaves marker styles untouched, Reset → 1.000; floor switch clears the selection; Plotting → Wayfinding keeps the floor's graph.
- **Sylo 3837**: Floor 4 (15 / 14 stored, SVG present): Detect → no dialog, "Existing paths kept", 15 / 14, still on the image layer. Floor 0 (SVG only): detected 105 / 106 inferred, 10/10 linked; 10 of 10 markers within 3 px of their polygon's edge; a unit's bridge (too short to click: the unit sits on the corridor) selected and removed through its marker ("Bridge · A-A158 · 17 SVG units long"), another removed by double-click on its marker and restored by Ctrl+Z; Connect → point → a click **inside the unit's own polygon** (`A158…`, 22 × 17 px, away from the marker) → 10/10 again; route "27 SVG units · 5 points" with the inferred-points warning.
- **Alderwood 1234**: image floor without paths → 117 neutral markers, none red; Detect → "Skipped — no SVG", "Nothing to detect".
- **Shell**: favicon `/icon.png` served (200), profile "SS Salahudin Sallu · Super admin" in the top bar between the bell and Sign out on the map, Companies and the other pages, none in the sidebar. Companies, Properties (no inventory request), Property Detail, Inventory ×3, Tour Setup, Units, Dashboard load with 0 page errors.
- **Read-only:** 0 non-GET requests, 0 page errors, 0 console errors across every script.
- **Not driven:** the user's own puma on :3000 runs on the local `pynwheel_prod` copy, which this tool may not read; 1411 there (the brief's "Tower A · Floor 3", 20 points / 19 paths / 8/9 stops linked) differs from the development copy and was not exercised.

### Tests

`npm run typecheck` clean. Pure: `hallways.spec.ts` 29 (+3: additive `detectionPatch`, Auto-Connect over a stored graph adds `knn` page paths only, `polygonEdge`), `wayfindingLogic.spec.ts` 14 (+1: a detached bridge in counts, Not linked, the route error, re-linking) — 43/43. Real data: `wayfinding.spec.ts` (toolbar without Auto-Connect; Detect on a floorplate with paths is "existing" and every stored `[data-node="h:…"]` stays; the All-floorplates run keeps stored points), `mapPlotting.spec.ts`, `mapCanvas.spec.ts` — 19/19 against the verify pair. Regression: `amenities`, `hazel`, `listingsAndInventory`, `tourSetup`, `routes`, `screens`, `interactions` — 103/104 on the first run, the one failure being Hazel's map test hitting the dev server's stale module graph after an rsync mid-compile (`__webpack_modules__[moduleId] is not a function`, trap documented in context.md §21); after a clean restart (`rm -rf .next`) `hazel.spec.ts` 12/12 — so every spec passes. **Build:** `next build` on a copy of the tree compiled successfully; the map route is 43.7 kB (43.1 kB before: the bridge handlers, the markers on both layers and the profile context).

### Remaining

Gaps M14, M16 (updated), M20–M24 in `gaps_map_plotting_feature.md`. Vertical rides (an elevator's link between two floors) are derived from the record's floors, not drawn, so they cannot be removed as an edge — unplotting the elevator's stop on a floor takes it out of that floor's routing instead. The user's prod-DB copy of 1411 remains to be checked by hand on `localhost:3001`.

### Final pre-production run on `main` (October 2, 2026, after PRs #15–#17 were merged)

`main` `1357822ec` = `origin/main`; its tree is identical to `8ee78da06`. Against a verify pair rebuilt from it (CMS :3100 on `pynwheel_development`, Connect :3005 from a clean copy, minted super-admin session): `tsc --noEmit` clean; the **whole** Playwright suite — all 13 specs, 166 tests (pure + real data: listings, inventory, amenities, Hazel, Tour Setup, routes, screens, interactions, map plotting, canvas, wayfinding, hallways, wayfinding logic) — 166/166 in 3.3 min; the end-to-end scripts 73/73 and 14/14 (John Demo 1411, Sylo 3837, Alderwood 1234, the shell pages); 0 non-GET requests, 0 page errors, 0 console errors; `next build` compiled with no warnings, map route 43.7 kB, shared JS 102 kB. Not run: the Rails Minitest suite (no `pynwheel_test` database locally; the Rails side has not changed since phase 2m, and every Connect JSON endpoint is exercised by the real-data specs) and the user's own `pynwheel_prod` copy of 1411.

### Follow-up on `main` (October 2, 2026, evening): the Detect menu's hover gap, and why a kept floorplate stays Incomplete

Two reports from the user's own copy of John Demo (Tower A · Floor 1: "Nothing to detect · 24 stored hallway points kept" while the floorplate reads Incomplete).

- **Menu.** `.bo-map__apmenupanel` sat 6 px under its button through a margin, outside the `.bo-map__apmenu` wrapper whose `onMouseLeave` closes the menu, so the pointer crossing the gap closed it. The panel now sits at `top: calc(100% + 6px)` with a transparent `::before` strip bridging the gap; both menus (Auto Plot, Detect Hallways) keep open until the pointer leaves the panel.
- **Why Incomplete.** Detect keeps stored paths and auto-connects; it cannot link a unit or amenity plotted only on the floor **SVG** when Wayfinding runs on the floor **image** (no shared frame, M20) — Business Center there, 78 of 91 units on Sylo Floor 4. The card now says so: title "Existing paths kept · N not linked", each kept row names the first three such stops with the reason ("Plotted on the floor SVG only — it has no position on the floor image Wayfinding uses here", "bridge removed on this page", "nearest point has no path"), the body says what to do, and the Detect card reads the live floorplates (`generateDetectView(state, plates)`), so it updates as stops get linked.
- **The way out, since Plotting mode has no floor-image layer for a floor with both files.** With a hallway point in hand (Connect's first click, or the selected point) every "Not linked" row shows a button: "Link to the selected point", or for a stop on the other layer "Place at the selected point and link". `linkListed` writes `wfLinks` and, for the latter, `wfPlaces[`${levelId}|${key}`] = { x, y, space }` — a page-only position on this layer, in `WfSnapshot` (Ctrl/Cmd+Z), dropped by Clear Paths — and `wayfindingPlate.placeAnchor` uses it as the item's centre when it has no door or pin here (`WfAnchor.placedHere`). The marker appears at that point, the bridge is zero-length, the route ends there.
- **Validation** (verify pair, `scratchpad/verify-menu-kept.mjs`): the menu stays open through the 6 px gap and inside the panel, closes when the pointer leaves; Sylo Floor 4 (15 / 14 stored, 13/91 linked) → Detect → "Existing paths kept · 78 not linked", row "15 stored hallway points kept — not overwritten · 78 not linked — A-A401 (Plotted on the floor SVG only …), B-B401 …", 15 / 14 unchanged; Connect → point → "Place at the selected point and link" → 14/91, one more marker on the image, card "77 not linked", a route reaches the placed unit; Ctrl+Z → 13/91. 0 non-GET requests, 0 page errors. Pure specs 45/45 (+1: a unit plotted only on the SVG has no place on the image floor; placed at a point by hand it links and routes there; +1: the kept card names the stops and reads live). Whole suite on the final tree: 168 tests, 167/168 on the first run — the one failure a 30 s test timeout filling the Add Amenity dialog while `next build` ran on the same machine; `amenities.spec.ts` alone 2/2 right after — and `next build` compiled with no warnings, map route 43.9 kB. These changes are uncommitted on `main` (14 files) at the time of writing.

---

## 29. Phase 2p: Critical issues, phase 1 — map labels and loading, dropdown gaps, pager sizes, units page by page, company filters, product state (October 3, 2026)

**Brief:** `critical_iisues_phase1.md` (untracked, like the other briefs) with its screenshots in `critical_issues_pictures/`. Eleven issues across Map & Plotting, Inventory, Amenities, Companies, Properties and Property Detail, all on the existing architecture, all tested on real data (John Demo 1411 and the other real ids below). Rule unchanged: the database stays read-only; backend changes only expose existing data as JSON.

**Branch:** `fix/critical_issues_phase1`, from `main` (`a9271c089`).

### Issue → root cause → change

| # | Issue | Root cause (reproduced) | Change | Verified |
|---|---|---|---|---|
| 1 | Map showed `142-A`, `105-A +3`… permanently | `MapCanvas` printed an overlay label on every plotted polygon whose unit name differed from the SVG's own text (`PolygonDescriptor.assigned`), and the code of unnamed polygons once filled | No permanent labels: a polygon's code prints only while it is hovered or its popover is open, and only when the SVG prints nothing for it. **Hover shows what a click shows**: the polygon popover (`generateHoveredPolygon`, the same descriptor the click pins), a stop's popover, a marker's name. The hovered popover lingers while the pointer travels into it (`usePeek`) so Unplot stays reachable; a click pins it. Hover is tracked in every mode and compared with the page's own state (`SvgPlanLayer.hoveredKey`), and a pointer over the SVG's room number counts as over its polygon (`elementsFromPoint` fallback, the legacy point-in-shape test) | 1411, Sylo 3837, Hazel 1618; `mapCanvas.spec.ts` |
| 2 | Dropdown closed in the gap between trigger and options | The Plot on Map "Show" menu sat 6 px under its button through a margin outside the wrapper whose `onMouseLeave` closes it (the Auto Plot and Detect menus had been bridged on Oct 2, one-off) | One shared molecule, `HoverMenu`: wrapper + panel at `calc(100% + var(--bo-menu-gap))` with a transparent bridge strip, outside-click and Escape close. All three hover-close menus use it; the audit found no other floating menu that closes on hover (MultiFilter and the route picker close on outside click) | all three menus, through the gap and diagonally |
| 3 | Red/yellow markers under the loading cat | Pins, nodes, paths, stops and labels rendered as soon as the level's graph existed; only polygon pins waited for the SVG | `MapCanvas.ready`: nothing is drawn over the plan while its SVG or image is still loading (a failed image still shows the stored markers over the "could not be loaded" plan). A floor switch therefore never shows the previous floor's markers | Hazel (delayed image), Sylo (delayed SVG) |
| 4A | Building row for a one-building property | The row rendered whenever one building existed (the Sep 30 design match) | The row renders only when there is a choice (`buildings.length > 1`); several buildings keep the pills and selection | 1411 (none), Trestle 1105 (9 pills) |
| 4B | Wayfinding text not centred; the delete icon wrapped | `.bo-map__toolbar` wrapped as a whole; the title row used `align-items: baseline` and `white-space: nowrap` | `| switch | text | actions |`: the toolbar no longer wraps, the text block (`.bo-map__toolbartext`) is the only part that shrinks and wraps, centred on the switch; the actions sit in `.bo-map__toolbaractions` (`flex: 0 0 auto`). Below 760 px the whole action group moves to its own row as a unit | measured at 1440 and 1000 px, with a 160-character status |
| 5 | Image viewers had no zoom | `ImageViewer` (the one lightbox behind every eye action: floorplates, floorplans, units, amenities, unit detail, the dialogs' previews) only fitted the image | The map's viewport in the viewer: Zoom In / Zoom Out (×1.3, 1–8×), Reset, wheel about the pointer, drag to pan; the image is only ever scaled uniformly | floorplate, floorplan, unit and amenity viewers |
| 6 | "In Stops List" on properties without the tour | `generateAmenityCards` always added the stop-list pill | The pill and the State filter's stop-list options exist only when the property has the Self-Guided Tour (`amenities.json` `meta.self_tour`, now `Connect::ProductState`) | The Ogden 557 (off), Hazel (on) |
| 7 | Upload icon on unit cards | The thumb offered Manage images (→ Unit Detail) and Remove image, and an "Add image" tile | Only View images. A unit with no image shows a quiet "No image" tile (`MediaThumb` placeholder without `onClick`), so the thumbnail column keeps its place | 1411 Units tab |
| 8A | No rows-per-page | `Pagination` had none; inventory tabs paged at 20 / 25, listings at Rails's 10 | `Pagination` offers 25 · 50 · 75 · 100 (`PAGE_SIZE_OPTIONS`, default 25) wherever a caller can act on it: Companies and Properties (`per_page` on the URL and the Rails request; the default needs no parameter), Floorplans, Amenities (`useClientPages` page size) and Units (the request). A new size starts from page 1 | Companies 50, Properties 75, Units 50 / 100 |
| 8B | Units loaded all 230–670 rows upfront | `units.json` was unpaginated; the tab filtered, searched and paged the whole set in the browser; four dialogs waited for that listing | **Page by page.** `UnitsController#index` with a `page` answers one page through `Connect::UnitListingQuery` (UnitFilterQuery's join, search, ranges and order, plus the tab's multi-select filters in SQL, paged by `Connect::PaginatedCollection`) with `meta.pagination` and `meta.filters` (buildings, floors, bedrooms, bathrooms, which "None" options are needed). Without a `page` the listing is unchanged (Map & Plotting, Tour Setup and Unit Detail draw every unit). `useInventoryUnits` turns the toolbar into that request through `/api/properties/:id/inventory/units?page=&per_page=&…` (typed inputs after a 350 ms pause); the Inventory route never loads units; the dialogs read the units' buildings, the manual-marker count, the PMS and the lock devices from the floorplates meta instead (`unit_buildings`, `unit_override_count`, `data_provider`, `last_sync`, `lock_devices`); the unit form is given its row by the tab | Network: page 1 = 25 of 230; page 2; size 50 / 100; Floor 2 → 54; search keeps the filter; every request names a page |
| 9A | Companies had no filters | `AccessibleCompaniesQuery` had only `q` | Status (Active / Inactive), PMS Provider (the slugs in scope + Not configured, `meta.filters.pms_providers`), Properties (With / No properties): comma lists, OR within, AND across, in SQL; the same `MultiFilter` + URL pattern as Properties | inactive 1, yardi 3, without 26, combined |
| 9B | Property count not clickable | A plain number cell | `number` cells take an `href`: the count links to `/properties?company_id=N` (the listing's existing server-side filter); the Companies filter shows the selection, Clear and Back behave | company 668 → 1 property |
| 10 | Products card / column not trusted | Both already read the DB, but a product that was off still showed a count ("23 tour stops" with Tour off), and three JSON branches each decided "Self-Guided Tour enabled" on their own | `Connect::ProductState` is the one definition (column or Launch order form, as the listing has read it since phase 1); the listing row, Property Detail, `amenities.json` meta and the wayfinding settings all read it, and `AccessibleCommunitiesQuery::PRODUCT_CONDITIONS` mirrors it in SQL. A product that is off reads "Not enabled" with no count. The cards stay display-only | 1411 (230 units · 4 floorplates / 5 tour stops / Enabled), 557, 1232, 1618: card = listing = JSON |
| 11 | Wayfinding gated on `auto_wayfinding` | `wayfindingEnabled = selfTour && autoWayfinding`; 156 properties have the tour without the switch | Wayfinding (the mode, Additional Stops, vertical links) is offered to every Self-Guided Tour property; `auto_wayfinding` keeps driving the door-plus markers only | Lincoln at Dilworth 1232 (tour on, switch off) has Wayfinding; The Ogden 557 (tour off) has none |

### Backend (read-only JSON only; no schema, migration, business rule, authorization or write changed)

| File | Change |
|---|---|
| `app/serializers/connect/product_state.rb` (new) | `touch?` / `tour?` / `maps?` / `all` |
| `app/serializers/connect/property_serializer.rb`, `wayfinding_serializer.rb`, `app/controllers/amenities_controller.rb` | read `ProductState` |
| `app/queries/accessible_communities_query.rb` | `PRODUCT_CONDITIONS` mirror `ProductState` (the `is_enabled` branches) |
| `app/queries/connect/unit_listing_query.rb` (new) | the Units tab's paged, filtered listing |
| `app/controllers/units_controller.rb` | `render_connect_units` pages when `page` is given; `connect_listing_params` |
| `app/controllers/concerns/connect/inventory_json.rb` | `render_connect_inventory(pagination:, total_count:)`; `connect_lock_devices(community)` shared |
| `app/controllers/floorplates_controller.rb` | meta `unit_buildings`, `unit_override_count`, `data_provider`, `last_sync`, `lock_devices` |
| `app/queries/accessible_companies_query.rb`, `app/controllers/companies_controller.rb` | `status`, `pms_provider`, `properties` filters; `provider_options` → `meta.filters.pms_providers` |

Checked with the minted session on `pynwheel_development`: `units.json?page=1&per_page=25` → 25 rows, `pagination {1, 25, 230, 10}`, `filters {buildings [A], floors [2–5], bedrooms [1,2,3], bathrooms [1,2,2.5]}`; every filter narrows (plotted 226 + unplotted 4 = 230; now 27 + sold/not available 203 = 230; floor 2 → 54; beds 1 → 119; q=2 → 99; the three combined → 10); the unpaged listing still answers 230 rows with no pagination. Products: touch 544, tour 227, maps 76 rows, every row's flag true. Companies: status=inactive 1, pms_provider=yardi 3, properties=without 26, all three combined 14.

### Frontend

- **New:** `molecules/HoverMenu`, `hooks/usePeek`, `PlusIcon` / `MinusIcon` / `ResetIcon` (atoms/Icons), `CORE_STRINGS.pager`, `companies.filters`, `inventory.viewer.zoom*`, `inventory.units.noImage`.
- **Map:** `MapCanvas` (`ready`, hover popovers and labels, `hoveredKey`), `SvgPlanLayer` (hover in every mode, point-in-shape fallback), `WayfindingLayer` / `StopMarker` (`onHover`), `mapPanels.generator` (`polygonPopover`, `generateHoveredPolygon`, `SelectedPolygon.key`), `wayfinding.generator` (`wayfindingEnabled`), `propertyMap.screen` (Building row, toolbar structure, HoverMenu), `WayfindingToolbar`, `MapPanels`.
- **Inventory:** `useInventoryUnits` (server-driven), `units.generator` (`unitListingQuery`, options from `meta.filters`; the browser filter removed), `usePropertyInventory` (no units loading), `InventoryDialogs` (no pending state; `UnitDialog` takes `unit`), `inventoryForms.generator` (`buildingOptions` from `unitBuildings`), `inventoryHeader.generator` (`dialogNeedsUnits` removed), `UnitsSection` (states, pager, View only), `MediaThumb` (static placeholder), `propertyInventory.screen`, the inventory route (`units: false`), `propertyInventory.server` (`loadInventoryUnitsPage`), `inventory.api` (`fetchInventoryUnitsPage`), the units route handler (query string → request), model and parser (`UnitListingOptions`, `pagination`, `options`, `totalCount`, `unitBuildings`, `unitOverrideCount`).
- **Listings:** `Pagination` (rows per page, i18n), `pagination.generator` (`PAGE_SIZE_OPTIONS`, `clampPageSize`), `useClientPages` (page size), Companies page / api / hook / screen / generator (filters, count link), Properties page / hook / screen (`per_page`), `CustomTable` (`number` link), `listing.types`, `session.data` + `envelope.parser` (`pmsProviderOptions`, `parsePagination` exported).
- **Amenities / detail:** `amenities.generator` (`generateAmenityCards(…, selfTour)`, State options), `useInventoryAmenities`, `propertyDetail.generator` (`productMetric`).
- **CSS:** `.bo-hovermenu*`, `.bo-map__toolbaractions` / `__toolbartext`, `.bo-pager__left` / `__size*`, `.bo-cellnumber--link`, `.bo-thumb--static`, `.bo-viewer__zoom*` / `--zoomed` / `--panning`.

### Validation (CMS :3100 on `pynwheel_development`, Connect :3005 from an rsync'd copy, headless Chrome, minted super-admin session; scratchpad `verify.mjs`, 73 checks)

73/73 checks pass across the issues above; 0 non-GET requests, 0 page errors, 0 console errors. Highlights: the three menus stay open through the gap, diagonally into the options and inside, and close when left; John Demo shows no Building row and Trestle 9 pills; the Wayfinding text is centred on the switch (centres 293.0 / 293.0) and a 160-character status wraps to 113 px while the delete icon stays on the switch's row at 1440 and 1000 px; Hazel's floor image delayed 4 s → cat on screen with 0 overlays, then 2 pins and 8 nodes, a floor switch likewise; Sylo's SVG delayed → 0 overlays, then 10 filled polygons with 0 labels, hover → "Polygon A168" with its item and Unplot, pointer into the popover keeps it, leaving clears it, zoom and a mode round-trip print nothing; a hovered stop shows its popover; the Units tab: page 1 = 25 of 230, page 2, size 50 → 50 cards, 100 → 100, Floor 2 → 54 matching, search keeps the filter, 8 requests all with `page` and `per_page ≤ 100`, the unit dialog opens with no request; unit cards offer only "View images"; the viewer zooms 1.300 → 1.690 with the aspect ratio 1.500 kept, Reset disables itself; The Ogden shows no stop-list badge and no stop-list State options, Hazel keeps them; Companies: the three filters, yardi → the CMS's 3 rows, inactive ∧ yardi → 0, without → 26, size 50 / 25; the count link → `/properties?company_id=668` → 1 row of that company, the Companies filter shows it, Clear and Back work; Properties default 25, 75 on request; Products cards for 1411 / 557 / 1232 / 1618 equal the JSON and the listing's tags.

### Tests

`npm run typecheck` clean. Playwright against the verify pair (run with the project's own binary, `./node_modules/.bin/playwright`): `listingsAndInventory.spec.ts` rewritten for page-by-page units (page 1 of 25 with its body, page 2, size 50, search, revisits request a page, the deep link reads one page, no dialog reads the units, a 502 then Retry) and `per_page=25` on every CMS comparison; `mapCanvas.spec.ts` asserts no permanent labels, the hover popover (shown, reachable, hidden on leave), the hovered code of an unnamed polygon, and a 180 s budget for the 2.6 MB real floor SVG; `wayfinding.spec.ts` waits for the floor image before counting stored nodes; the one-building test asserts the absent Building row; `amenities.spec.ts` gives the viewer's S3 photo the 90 s budget the Hazel spec already gives its photos. **Whole suite** (13 specs, 168 tests) against the verify pair: 165/168 in the parallel run (5.1 min); the three failures — two 30 s `page.goto` timeouts under load and the amenity viewer's image still streaming from S3 (5–90 s per file from this machine today) — pass serially, so every spec passes. `next build` on a copy compiled with no warnings: map route 44.7 kB (43.9 before: the hover popovers and the shared menu), shared JS 102 kB.

### Remaining

- Unit Detail still loads every unit of the property to show one (no single-unit JSON), as in §24.
- The Properties listing's Company filter options list every company in scope; a Companies-page link always resolves because the company is in scope.
- The user's own `pynwheel_prod` copy of 1411 was not driven from here (this tool may not read that database); every check above ran on `pynwheel_development`.

---

## 30. Phase 2q: listing search race, searchable filters, Property Detail on real data for every property (October 3, 2026)

**Brief:** "Search, filter, and property data implementation" (pasted into the session; not a file). Three parts: the search race in Companies and Properties, searchable filter dropdowns on both listings, and a Property Detail page with nothing but DB-backed values (the Property Launch Lifecycle left exactly as it is). Same rule as every phase: read-only, backend changes only to expose existing data.

**Branch:** `fix/critical_issues_phase1` (continued; six commits of §29 precede this).

### Issue 1 — the search race

**Root cause (reproduced on the Sep 24 flow).** A committed search was a `router.push` to `?q=…`; the listing was then re-rendered on the server and the screen re-read `initialQuery` from the URL. Two things went wrong when the user typed faster than the network: (1) `useDebouncedSearch` re-synced its box from `initialValue` on every URL change, so when the "ha" render landed while "haz" was in flight the box visibly went back to "ha"; (2) Next's router owns navigation fetches, so nothing could cancel "ha" once "haz" started, and the render for "ha" could still replace the rows. Filters and paging were separate pushes built on the URL as it was, so a page could belong to a search the user had already left.

**Change: one client-driven request per change (`useServerListing`).** The listings keep their server render for the first paint and for any full navigation; after that every change of search, filter, sort, page or rows-per-page is one `fetch` from the screen to a new route handler (`/api/listings/companies`, `/api/listings/properties`), which replays the session cookie to the existing `companies.json` / `communities.json` through the same loaders and parsers the page uses (`listings.server.ts`), and returns the parsed rows and meta. The hook:

- **debounces** typing (300 ms; toggles, paging and sorting request at once, with whatever is typed folded in);
- **aborts** the previous request with `AbortController` when a new one starts;
- **protects the latest request**: every request carries a sequence number and a response is applied only while it is still the latest — checked before and after its body is read — so a late "ha" (or a late answer after the search was cleared) changes nothing: not the rows, not the status, not the box;
- keeps the **search box as local state** that only the user (or a URL the user navigated to) writes; a response never writes it back;
- keeps the **URL in step** with `window.history.pushState` (Next 15's native-history integration), and reloads from the URL when it moves without the hook (Back / Forward, a link), comparing canonical query strings (`listingParams.ts` is the one reader and writer of the listing state);
- always requests **search + filters + sort + page as one state**, so a page is never one of another search; any change but paging starts from page 1.

The two hooks (`useCompaniesListing`, `usePropertiesListing`) are now thin: generators plus toggles over `useServerListing`. `useListingParams` and `useDebouncedSearch` are gone.

### Issue 2 — searchable filter dropdowns

`MultiFilter` (the one filter molecule both listings and the inventory tabs use) gains a search box above its options when the list has six or more (`SEARCHABLE_FROM`, or `searchable` set by the caller): focused when the panel opens, case-insensitive, matching anywhere in the label, narrowing at once, Enter ticks the first match, a × clears it, "{n} of {m} shown" in the footer, "Nothing matches" when none does; ticked options stay ticked whether or not they match; the box is empty again on reopen; Escape still closes, typing never does. Audit of the two listings: Companies → Status (2) and Properties (2) stay plain, PMS Provider (6 incl. "Not configured") is searchable; Properties → Status (5) and Products (3) stay plain, Companies (191 in the development dump) and Data Providers (13) are searchable. The filters are click-opened, so the Oct 2 hover-gap rule does not apply to them.

### Feature 3 — Property Detail on real data

The real page (numeric ids) has read `communities/:id/edit.json` since §16, and the audit found every rendered value derived from the record: header, the four profile groups (with their empty states "—", "Not set", "Unassigned", "No notes yet."), Products (`Connect::ProductState` since §29; an off product reads "Not enabled" with no count), inventory counts (`.count` on the associations, no records loaded), sub-communities, ILS partners, the 16 Property Settings and the Touch / Tour / Maps cards (disabled controls), the Billing Rate Card (stored strings; blank → "Not set"), the lifecycle (unchanged: the serializer's five milestone-dated stages). No `DemoMark`, no demo flag, no mock import on that path. One change: the Self-Guided Tour card offers its Tour Setup / Tour Scheduling links only while the property has the tour, as the legacy menu shows Tour Setup only then. The slug-id route (`/properties/luxe`) still opens the phase-2 demo screen with its placeholder legend, as every demo screen does; it is not the Property Detail page of any property.

### Backend

None. No controller, serializer, query, route, schema or migration changed in this phase.

### Frontend

- **New:** `core/utils/generator/listingParams.ts` (params, readers, canonical query strings for both listings), `core/repository/remote/listings.server.ts` (`loadCompaniesListing`, `loadPropertiesListing`, `emptyListing`), `app/api/listings/{companies,properties}/route.ts`, `core/hooks/useServerListing.ts`, `tests/e2e/listingSearch.spec.ts`.
- **Changed:** `useCompaniesListing`, `usePropertiesListing`, both listing pages (`companiesParamsOf` / `propertiesParamsOf` + the loaders), both listing screens (`initial` + `params` props), `MultiFilter` (+ `.bo-multifilter__search*` / `__empty` CSS and `filter.search / clearSearch / noMatches / matching` strings), `urls.ts` (`APP_API.companiesListing / propertiesListing`), `propertyDetail.generator.ts` (tour links), `companyListing.generator.ts` / `propertyListing.generator.ts` (the old filter types removed).
- **Removed:** `useListingParams.ts`, `useDebouncedSearch.ts`.

### Validation (CMS :3100 on `pynwheel_development`, Connect :3005 from an rsync'd copy, headless Chrome, minted super-admin session)

- `tests/e2e/listingSearch.spec.ts` (6 tests, real data): for both listings, "ha" is held 2.5 s and the user types "z": only "ha" and "haz" are ever requested ("h" never is), the box, the rows and the URL show "haz" at once and still do 3 s later when the old answer would have landed, the old request is aborted (`ERR_ABORTED`); clearing the search while "ha" is held → the unfiltered rows, still there 3 s later; on Properties a page, a filter and a sort each carry `q=the`, a new search keeps the filter and the sort and starts from page 1, and Back restores the previous state with its rows; the Companies and Data Providers filters are searchable (focused, case-insensitive, narrowed count in the footer, pick → `company_id` on the URL, clear → full list with the pick still ticked, "Nothing matches", empty on reopen) while Status and Products are plain; on Companies, PMS Provider narrows to "resm" and Enter ticks ResMan. 0 non-GET requests, 0 page errors.
- `scratchpad/verify-detail.mjs`, 10 real properties — 1411 John Demo (all three products), 557 The Ogden (Touch only), 1232 Lincoln at Dilworth (Tour only, auto wayfinding off), 1618 Hazel (Touch + Tour), 1469 City's End (no products, no phone / website / manager), 1062 The Line (no address), 2048 Cityway Test, 1778 Paperbox Lofts (a named manager), 2919 Sofia (Tour + Maps), 1107 (no city): on each, no placeholder mark, legend or demo text on the page; header, every profile field (or its empty state), the Products card (on/off and metric), the four inventory counts, the ILS partners, nine Property Settings toggles, the tour card's toggles, the billing rates (blank → "Not set") and the lifecycle's current stage all equal `edit.json`; the Products card holds no control; the config cards' controls are disabled; the tour's links appear only when the tour is on; Map & Plotting opens for every property and offers Wayfinding exactly when the tour is on; Tour Setup opens with the DB's stop count for the tour properties. **145/145 checks, 0 non-GET requests, 0 page errors.**
- **Whole Playwright suite** (14 specs, 174 tests, `./node_modules/.bin/playwright test`): 162/174 in a parallel run that took 24 min because the verify copy's `.next` had just been cleared and every route compiled cold under the workers; all 12 failures were 30 s navigation / click timeouts on that cold server (no assertion failed), and the same 12 pass serially in 2.5 min on the warmed server — so every spec passes. `tsc --noEmit` clean. `next build` on a copy compiled with no warnings: `/companies` 1.27 kB, `/properties` 1.38 kB (the screens are thinner without the URL-navigation hooks), the two listing route handlers 157 B each, shared JS 102 kB.

### Remaining

- The listing route handlers answer the parsed rows, so a very wide `per_page=100` page is the same size as the server render was; nothing new is loaded.
- The demo screens the real page links to (Integrations, Branding, Home Screen & Pages, Pricing Calculator, Tour Scheduling) are still demo screens with their legend; making them real is phase 3.

## 31. Phase 3a: the persistence backend — Map & Plotting, Tour Setup, Show in Stops List, the Tour App API (October 4, 2026)

**Brief:** `backend_implementation.md` ("Critical production backend implementation — Map & Plotting + Tour Setup for the new Next.js UI"), built on `backend_architecture_plan_report.md` (owner decisions of October 3). The first phase that writes. Every write is a JSON action on the owning legacy controller, gated by `PYN_CONNECT_WRITES`; the legacy HTML flows are unchanged, and `ShortestPath`'s output is proven identical before and after.

**Branch:** `main`, uncommitted (the owner commits). The full account — every file, endpoint, migration, flow and verification — is `map_plotting_backend_implementation.md`; this entry is the short form.

### Backend

- **Schema (11 migrations, `20261003100001`–`…11`, all reversible):** wayfinding columns on `hallways` (`source`, `review_status`, `confidence`, `space`, `community_id`, `detection_run_id`, `confirmed_at`, `created_by_user_id`); `hallway_edges` (canonical pair, polyline, kind, review, run), `hallway_suppressions` (deletion tombstones), `hallway_attachments` (explicit / detached stop → hallway links, optional anchor), `hallway_detection_runs` (idempotent Detect runs by `client_request_id`), `wayfinding_stops` (entry / exit / blocker / leasing / restroom / mail / parking / waypoint); `elevators.kind / accessible / floor_positions`; `doors.note`; `floorplates` and `sitemaps` `wayfinding_version / svg_to_image_transform / scale_ft_per_px`; `tours.tour_setup_version`; `tour_stops.duration_minutes`; indexes on `tour_stops(stop_type, stop_id)` and `units(floorplate_id)`. Every pre-existing row keeps its meaning (manual, confirmed, floor-image pixels; elevator, accessible). The report's CHECK constraints wait for the data repair (`rake wayfinding:repair:all APPLY=1`, dry-run by default; `wayfinding:repair:report` reproduces the report's counts on the dev copy).
- **Writes:** `PUT /communities/:id/wayfinding_graph.json` (`HallwaysController#save_graph` → `Wayfinding::GraphSave`: one level's nodes, edges, links, pins and additional stops in one transaction; compare-and-swap on `wayfinding_version`; `origin: 'detect'` may only add — it merges within 6 px, skips tombstoned geometry and never touches a stored row; `request_id` replay; exactly one `selected` node; a PaperTrail row on the level). `PUT /communities/:id/tours/save_setup.json` (`TourSetup::Save`: order, visibility, add / remove, dwell time, elevator delete; CAS on `tour_setup_version`). `PUT /communities/:id/tours/stop_list.json` (`TourStops::Membership`: the one field the unit and amenity forms persist — find-or-create / remove the main tour's stop and, for an amenity, the form's `breezway_lock_visible`; idempotent; 422 `tour_disabled` without the tour). All three run through `Connect::WritesJson`: Devise session, `User#can_edit_map?` (a super or Dwelo admin on a property the user may access), the real CSRF check (`verified_request?` → 403 `csrf`), `Connect::Flags` (`PYN_CONNECT_WRITES` off → 404 `disabled`; `PYN_CONNECT_WRITES_COMMUNITY_IDS` allowlist), 409 `stale_version` with the current graph, 422 with per-item `errors[{path, code, message}]`.
- **Reads:** `automate_plotting.json` gains the edge rows, attachments, additional stops, suppressions, levels and `meta.versions / csrf_token / writes_enabled / can_edit_map`; `shortest_path.json?from=&to=&step_free=` routes two places on the persisted graph (`Wayfinding::RouteService`, error codes `unknown_endpoint`, `same_endpoint`, `ambiguous_floor`, `not_linked`, `blocked`, `no_step_free`, `no_vertical_link`, `no_building_link`, `no_path`, `no_start`); the legacy shape without `from` is byte-identical.
- **Tour App API (for the new mobile app):** `GET /api/self_tour/v1/communities/:id/wayfinding.json`, `…/wayfinding/route.json`, `…/wayfinding/tour_route.json` — the legacy token scheme (`Api::SelfTour::V1::TokenAuthorization`, extracted unchanged), domain concepts only, never an access code, ETag = `Wayfinding::GraphVersion` (which also carries `PAYLOAD_FORMAT`, so a deploy that changes the payload invalidates Redis-cached bodies and client ETags), `Rails.cache` by version, 422 `wayfinding_disabled` without the Self-Guided Tour.
- **Routing in Rails (`GraphBuilder` / `RouteService` / `Timing`):** per-floor copies of each level; elevators, stairs and ramps (`elevators.kind`) join the floors they serve; step-free leaves stairs and inaccessible connectors out; blockers cut the hallway they sit on; gates (entry / exit points, the tour start) join buildings; explicit and detached links are honoured, nearest-hallway attachment otherwise — the page's local preview semantics, on saved data.
- **Legacy engine:** `ShortestPath` reads `Hallway.routable` (confirmed ∧ floor-image frame) at its six load sites and lost an N+1; `rake wayfinding:snapshot` / `wayfinding:compare` proved the output identical on 9 real properties (web, both path types; mobile) and 3–4× faster.
- **Authorization:** `User#can_access_community?` is `check_community`'s rule as a method (same branches, same redirect); `can_edit_map?` on top. Legacy per-property authorization on the legacy controllers is unchanged (owner decision).

### Frontend

- **New:** `core/repository/remote/connectWrite.server.ts` (a fresh CSRF token + session cookie from the map read before every PUT, one retry on `csrf`, the merged cookie written back), `app/api/properties/[propId]/{map/save,tour-setup/save,stop-list,wayfinding-path}/route.ts`, `core/utils/wayfinding/graphDiff.ts` (`buildGraphSavePayloads`: the level's local overrides as one payload per space; `unsavedCount`, `clearSavedLevel`).
- **Changed:** `urls.ts`, `base.api.ts` (PUT / PATCH, `csrfToken`), `wayfinding.api.ts`, `propertyMap.server.ts` / `propertyMap.data.ts` / `wayfinding.parser.ts` (`write` meta, versions), `inventory.parser.ts` / `propertyInventory.data.ts` (`inStopsList`), `useMapWayfinding.ts` (`saveLevel`, `unsaved`, `canSave`, `saving`), `propertyMap.screen.tsx` ("Save changes · n" in both modes, `data-testid="map-save"`), `tourSetup.generator.ts` / `useTourSetup.ts` / `tourSetup.screen.tsx` (`buildTourSetupPayload`, Save, `data-testid="tour-save"`), `dialogParts.tsx` / `InventoryDialogs.tsx` (the unit dialog gains the Show in Stops List switch for tour properties; the amenity switch starts from `inStopsList`; Save persists that switch alone, and only when it changed), `amenities.generator.ts` (the pill and the State filter read `inStopsList`), `strings.ts` + `i18n/index.ts` (save states; "(local only)" gone), `tests/e2e/wayfinding.spec.ts` (the Save button in the toolbar), `tests/e2e/amenities.spec.ts` (the pill's meaning: Bowers has 7 amenities outside the tour's stop list, not 1), `tests/e2e/wayfindingLogic.spec.ts` (fixtures).
- After a successful save the screen drops the level's local overrides and `router.refresh()`es, so what is drawn is what the CMS now stores.

### Validation (CMS :3100 on `pynwheel_development` with `PYN_CONNECT_WRITES=on API_ACCESS=true`, Connect :3005 from an rsync'd copy, minted super-admin session)

- **Backend cycle on 1411 / floorplate 1867** (`scratchpad/verify-backend.py`, `verify-backend2.py`): 403 without the token; 409 stale with the current graph; 422 invalid with per-item paths and nothing written; an edit save (node + polyline edge + restroom stop + explicit link; the adjacency mirrored on the lower id; one `selected`; an audit row); detect (merge / add / skip); replay by `request_id`; a second run adds nothing; detect may not delete (422); move pending → confirmed and mirrored; delete → tombstone → re-detect suppressed; cleanup back to the baseline counts. Show in Stops List ON / ON / OFF / OFF idempotent with the unit row otherwise unchanged; the amenity flag and row move together; 557 (no tour) → 422. Tour Setup hide + dwell, 409, restore. The legacy editor's five POSTs (with the page's CSRF header) still work and fill the new columns' defaults.
- **Browser** (`scratchpad/verify-ui.mjs`): Map & Plotting add point → Save → 24 → 25 hallways in the CMS, linked from its nearest stored node, re-read and drawn; Tour Setup Hide → Save → `display_stop f`, Show → Save → `t`; amenity "Business Center" Show in Stops List → Save amenity → stop row + flag. Exactly four PUTs, 0 page errors.
- **Tour App API** (`scratchpad/verify-backend3.py`): 1411 graph (311 nodes, 75 edges, one elevator on four levels, no `access_code`, every node with a concrete floor), 304 on `If-None-Match`, route 229 → 315 = walk · Elevator 1 to Floor 3 · walk, 1,707 px in 0.09 s, step-free, `unknown_endpoint`, the tour route with its two honest warnings (the plate's disconnected piece); 2919 / 1105 / 2934 / 1839 / 1618 / 1412 graphs in 0.14–0.29 s and their tour routes; 557 → `wayfinding_disabled`; the existing app's `start_tour` unchanged (200, 0.73 s).
- **Rails tests:** 103 runs, 338 assertions, 0 failures, 0 errors, 7 skips (the dead `schedual_tours` scaffold). **Note:** `.gitignore` ignored `test/` (line 26), hiding the 22 new test and fixture files; the owner had the rule dropped on October 5, 2026, so they now show as untracked.
- **Playwright** (`wayfinding.spec.ts`, `wayfindingLogic.spec.ts`, `hallways.spec.ts`, `tourSetup.spec.ts`, `amenities.spec.ts`: 59 tests): all pass after the two expectation updates above. `tsc --noEmit` clean.
- **Not verified here:** the owner's `pynwheel_prod` copy (never touched), staging and production, the JWT token path (`SECRET_KEY_BASE` is unset locally, so the API ran with `API_ACCESS=true`), a "Testing 123" property (none in the dump), `next build`.

### Remaining

- The page's Test shortest path still previews locally (`stopRoute.ts`, unsaved edits included); the server route (`/api/properties/:id/wayfinding-path`) is wired but is not yet the preview's source.
- `wayfinding_stops` are not `tour_stops` yet (phase 2 of the report: the three legacy guards first); Tour Setup lists the legacy stop types.
- SVG-space rows (detected on a floor SVG) are stored but non-routable until a `svg_to_image_transform` exists; `ReprojectPlate` and `DetectionUndo` have no endpoint yet.
- The data repair (`rake wayfinding:repair:*`) and the CHECK constraints have not been applied anywhere.
- Feet and minutes on routes need `scale_ft_per_px` per level, which nothing sets yet.
- **October 5, 2026:** Save is offered in Wayfinding mode only and unit / amenity pins are no longer sent (`PLOTTING_SAVE = false` in `graphDiff.ts`): a pin saved to the CMS could not be removed from the plan. The backend still accepts them; the Plotting note says pins stay on the page.
