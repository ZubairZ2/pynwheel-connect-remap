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
