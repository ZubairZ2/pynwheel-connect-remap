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
| **3**: Replace demo data with real Rails data | *brief not written yet* | — | ⏭ Next (§11) |

**`main` holds everything above except 2d** (PRs #1–#3 merged, Sep 24). Local `main` is one commit ahead of `origin/main` (`c9416ae67`, this doc's catch-up; not pushed).

The three older feature branches are fully merged. Phase 2d's work sits uncommitted on `feature/properties_detail_page`. Commit and open a PR, or merge it, before starting other work from `main`.

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
