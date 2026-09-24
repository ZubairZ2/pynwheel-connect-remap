# Pynwheel Connect: progress and handoff

**Last updated:** September 24, 2026
**Read this first in a new session.** For what the repository itself is (Rails stack, models, roles, integrations), see [context.md](context.md).

This is the single progress document. It merges the original phase 1/2 handoff with the Sep 23 summary (formerly `progress.md`, now removed), and it is current through phase 2c (§14).

---

## 1. Status at a glance

| Phase | Brief | Where | State |
|---|---|---|---|
| **1**: Sign In, Companies, Properties on real data | [feature1.md](feature1.md) | `feat/pyn-connect-initial-screens`, **PR #1** open against `main` | ✅ Done |
| **1b**: Pagination, 10 per page, server-side | chat request, Sep 17 | `feat/pyn-connect-initial-screens` (`dec760dda`) | ✅ Done |
| **2**: Full `pyn-connect-new.html` UI on demo data | [feature-whole-ui-next.md](feature-whole-ui-next.md) | `feat/pyn-connect-full-ui` | ✅ Done |
| **2b**: Merge 1b into 2 | — | `feat/pyn-connect-full-ui` (`4ec2242aa`) | ✅ Done. ⚠️ One doc section was lost (see §10) |
| **Staging deploy** on Heroku (Rails and Connect) | chat, Sep 23 | apps `pyn-system` and `pyn-system-connect` | ✅ Live |
| **2c**: Companies and Properties listings → the 22-Sep design | chat, Sep 24 | `feature/Companies_and_properties_improvments` (uncommitted) | ✅ Done, 4 items deferred (§14) |
| **3**: Replace demo data with real Rails data | *brief not written yet* | — | ⏭ Next (§11) |

**`feat/pyn-connect-full-ui` is now the working branch.** It contains everything above. `feat/pyn-connect-initial-screens` is fully merged into it and only matters for PR #1.

---

## 2. What this is

**Pynwheel Connect** is the new back office: a Next.js app in [pyn-connect-web/](pyn-connect-web/) that reads the **existing Pynwheel CMS (Rails) in this repo**.

- It has no second backend.
- It adds no new authentication system.
- Real data comes from `format.json` branches on the existing controllers.

| Screens | Data |
|---|---|
| Sign In, Companies, Properties | **Real**: Devise and the local/staging Postgres |
| The other 29 screens and 9 dialogs | **Demo**: `pyn-connect-web/src/data/mock/*.mock.ts` |

### Input files

| File | What it is | How to read it |
|---|---|---|
| `feature1.md`, `feature-whole-ui-next.md` | The phase 1 and 2 briefs | Plain markdown |
| [react-architecture.md](react-architecture.md) | The architecture to follow **and keep updated** | §1–19 describe the **ezofficeinventory** React SPA (`/Users/zubairzulifqar/ezofficeinventory`, a different product). §20 is the dated log of how that maps onto Connect |
| `pyn-connect-new.html` | The design, 20 MB | **Not plain HTML.** It is a bundled page; see §13 for how to extract it. **Never paste it into a chat**, because it overflows the context |
| `pyn-connect-22-sep-new.html` | The 22-Sep revision of the design, 21 MB. **Now the target** for Companies and Properties (§14) | Same bundle format as above (§13) |

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

**Rules:**
- Only route handlers and server components touch the network.
- Components never fetch.
- Generators hold no state.
- Parsers are the only place a snake_case key exists.

### Phase 2 screens (demo data)

| Group | Screens |
|---|---|
| Overview | Dashboard |
| Accounts | Company detail, Regions, Portfolio Groups; Property detail, Pricing & Availability, Units & Floor Plans, Unit detail, Map & Plotting, Property Inventory, Tour Setup, Design System & Branding, Property Content |
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
| Types | `npm run typecheck`. ✅ Clean on `feat/pyn-connect-full-ui` after the merge (Sep 24) |
| Build | `npm run build` |
| End-to-end | `npm run test:e2e` (80 Playwright tests, real Chrome). Sep 24: 51 pass; the other 29 fail only on the unreachable Google Fonts request (trap 18) |

- **Database:** `pynwheel_development` on local Postgres (217 companies, 803 communities).
- **Sign-in account:** `salahudin@pynwheel.com` (Super admin). **Ask the user for the password**; it is deliberately not written down.
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
3. **Re-run `npm run test:e2e` on a network that reaches Google Fonts.** Sep 24 gave 51 passes; the 29 failures were all the font request (§14). The suite does not cover the real listings, which need a Rails session.
3a. **Phase 2c follow-ups:** see §14, "Remaining / follow-up".
4. **PR for `feat/pyn-connect-full-ui`:** not opened yet. PR #1 (`initial-screens`) is still open against `main`.
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
| Property detail | Extend `Connect::PropertySerializer` (products, locks, `move_to_production`, counts) | Partial |
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
2. **Property detail.** Extending `PropertySerializer` feeds the property header and the Dashboard KPIs.
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

**Deliberately untracked; do not commit without asking:**

- `pyn-connect-new.html` (20 MB) and `pyn-connect-22-sep-new.html` (21 MB)
- `feature1.md`, `feature-whole-ui-next.md`, `context.md` (until the user says otherwise)
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
- Screens are keyed by `isOrgs` (Companies), `isProperties` and `isAuth` (Sign In).
- `pyn-connect-22-sep-new.html` extracts the same way. Its manifest adds `MultiFilter.dc.html` and `ImageUploader.dc.html` (`ext_resources` maps the ids to file names). Rendering the file in Chrome (`file://…`, click Sign in, then the nav) is the quickest way to screenshot a reference.
- The four images for Sign In were extracted to `pyn-connect-web/public/images/`.

---

## 14. Phase 2c: Companies and Properties listings → the 22-Sep design

**Brief (chat, Sep 24):** bring the two real-data listings in line with `pyn-connect-22-sep-new.html`, using `pyn-connect-new.html` as the baseline to find what changed. Branch `feature/Companies_and_properties_improvments`. **Not committed yet.**

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
| C15 | Row click → property detail | Present | Present | Rows not clickable | Not built | — | ⚠️ |

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
| Row click opens detail (B6, C15) | Rows are not links | Present in both designs. Detail screens still run on demo ids |
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

1. Add Company / Add Property, and row click → detail: after the phase 3 decision on writes, and once detail screens read real data.
2. When Inventory, Map, Branding and Integrations become real (phase 3), the Go To links need no change.
3. If the business adds a richer lifecycle or company billing status, extend `STAGE_CONDITIONS` / `STAGE_PILL` and the company status mapping.
4. `Connect::CompanySerializer` still computes region, portfolio group and user counts that the listing no longer shows. That is three grouped queries per page; drop them if nothing else needs them.
5. The Companies filter lists 191 companies in a 274px scroll with no search box, as the design has it. A search field inside the panel would help.
6. Commit the branch and open a PR (no AI attribution, §3.11).
