# Repository context — pynwheel-staging

**Last updated:** September 24, 2026
**Companion doc:** [PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md), which covers where the Pynwheel Connect work stands and what comes next.

This file describes what the repository *is*. The progress doc describes what is being *done* to it.

---

## 1. What lives here

Two applications share this repo:

| App | Path | What it is |
|---|---|---|
| **Pynwheel CMS** | repo root (Rails) | The existing back office and API behind every Pynwheel product: Map (partner SDK), Touch (kiosk), Tour (self-guided tours), Access (locks) |
| **Pynwheel Connect** | [pyn-connect-web/](pyn-connect-web/) | The new back office. It is a standalone Next.js 15 app that reads the Rails CMS through a server-side proxy. See [PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md) |

Related projects outside this repo:

| Path | Role |
|---|---|
| `/Users/zubairzulifqar/ezofficeinventory` | Reference implementation for the React layering described in [react-architecture.md](react-architecture.md) §1–19. It is a *different product*, used only as a pattern source |
| `/Users/zubairzulifqar/pyn-system` | A separate future monorepo. Connect work does **not** go there |

- **Git remote:** `git@github-work:ZubairZ2/pynwheel-connect-remap.git` (`github-work` is the user's work SSH alias).
- **Default branch:** `main`.

---

## 2. Rails CMS stack

| Concern | Choice |
|---|---|
| Ruby / Rails | Ruby 3.3.5. `Gemfile` asks for `rails ~> 7.1`; the lock resolves 7.2.2 |
| DB | PostgreSQL. Local database `pynwheel_development` |
| Server | Puma. `Procfile`: `web` (rails s) and `worker` (sidekiq) |
| Auth | Devise, devise_invitable, Doorkeeper (OAuth at `api/v2/auth`), CanCanCan |
| Views / JSON | HAML (plus some ERB), Jbuilder. **Decision (Sep 11): keep Jbuilder, no serializer migration** |
| Jobs | Sidekiq 6 is the ActiveJob adapter (queues in `config/sidekiq.yml`). resque, sucker_punch and delayed_job also appear |
| Files | CarrierWave with fog-aws / S3, mini_magick, rmagick |
| Pagination | will_paginate (also kaminari) |
| Errors / APM | Bugsnag, Scout, exception_notification. **Decision: keep Bugsnag, no Sentry** |
| Assets | **Sprockets only**: jQuery, Turbolinks, Bootstrap 3 / AdminLTE, DataTables. There is **no React or webpacker in Rails** |
| Map SDK | Plain JS served statically from `public/sdk/pyn-map-sdk*.js` |
| Config | Figaro (`config/application.yml`) and ENV. Key *names* are listed in §8 |

Stack decisions came from [pyn-system-stack-proposal.html](pyn-system-stack-proposal.html). The user decided them on Sep 11:

- Next.js for the frontend.
- Current Jbuilder for serialization.
- Bugsnag for error tracking.
- Heroku first for hosting, then Vercel for the frontend and AWS for the backend.

---

## 3. Domain model (`app/models`, ~130 files)

```
Company ─┬─ Region ─┐
         ├─ CommunityGroup (belongs to Region) ─┐
         ├─ User (role string)                  │
         └─ Community (the "Property") ◄────────┘
              ├─ Floorplan ── Amenity (polymorphic amenityable)
              ├─ Floorplate ─┬─ Unit ─┬─ UnitSpaceDetail (student housing)
              │              │        ├─ Door, locks
              │              │        └─ TourStop
              │              └─ Elevator / Hallway / AccessPoint
              ├─ Sitemap (property map SVG) ── Amenity / wayfinding
              ├─ Gallery, Neighborhood, Webpage, Imagepage (content)
              ├─ Tour ─┬─ TourStop ── StopDetail / StopGallery
              │        ├─ TourSetting, SchedulerWidgetSetting
              │        └─ TourUser (prospect) ── SchedualTour, Favorite, VisitedStop
              └─ CommunityUser (User ↔ Community join)
```

- **Integrations:**
  - `Credential` / `CrmCredential` hold provider settings.
  - `companies.data_providers` and `communities.data_provider` name the PMS.
  - Locks: Latch, Igloohome, RemoteLock, Zerv, Dwelo, EdgeState, Schlage, Yale.
- **Design:** Design, DesignDirection, DesignSystemConfig, GroupDesign, FontSetting, CalculatorConfig.
- **Partner Maps / analytics:** MapPartner, MapFilter, SdkSession, TrackSession, Impression.
- **Other:** `SvgOptimizationRun`, `WebHookLog`, `paper_trail` versions.

**Naming traps:**

- The UI says **Property**; the code says **Community**.
- The design's markup keys companies as **orgs** (`isOrgs`, `orgId`).
- The code spells the model `SchedualTour`.

---

## 4. Controllers and API surface

| Namespace | Serves |
|---|---|
| root (~75 controllers) | Legacy CMS HTML screens: communities, companies, regions, community_groups, units, floorplans, floorplates, amenities, sitemaps, tours, tour_stops, tour_users, galleries, neighborhoods, design, lock accounts, crm_providers, partner_configurations, map_urls, reports, analytics, svg_optimizer, users, invitations |
| `users/` | Devise `sessions_controller.rb` (signs the user back out when `pynwheel_connect_access` is false) and `passwords_controller.rb` |
| `api/v1` | Pynwheel Tour app: tours, schedule_tours, wayfinding, tour_histories, igloohome/dwelo, perq/salesforce webhooks |
| `api/v2` | Touch/Tour apps behind Doorkeeper: communities, companies, floorplans, amenities, galleries, ebrochures, opening_hours, secure_locks, design_direction, data_providers |
| `api/touch/v1`, `api/self_tour/v1` | Touch kiosk, and self-tour with locks |
| `api/partner/maps` | Pynwheel Map SDK (`sdk_controller.rb`: config, data, svg, gallery, neighborhood, favorites, events), plus all_maps/properties/units webhooks |
| `scheduler_widget/` | Embeddable tour scheduler widget |
| Mounts | `/sidekiq`, `/cable` |

**Pynwheel Connect JSON** is a `format.json` branch on the *existing* controllers. There is no new API namespace:

- `GET /companies.json`: `CompaniesController#index` → `Connect::CompanySerializer`
  - Params: `page`, `per_page`, `q` (name, email, PMS provider, or a status word: `active` / `inactive`, matched by prefix).
  - `meta`: `total_count` (after search), `pagination`, `current_user`, `scope_total_count` (every company the user can see) and `property_total_count` (properties across those companies).
- `GET /communities.json`: `CommunitiesController#index` → `Connect::PropertySerializer`
  - Params: `page`, `per_page`, `q`, and four filters. Each filter takes a comma-separated list (or `[]` array). Values are ORed within a filter; filters are ANDed:
    - `stage`: installed, activated, production, approval, released
    - `company_id`
    - `product`: touch, tour, maps
    - `data_provider`: a provider slug, or `none`
  - `meta`: `total_count` (after search and filters), `pagination`, `current_user`, `scope_total_count` (before them), `filters.companies` and `filters.data_providers` (slugs; `none` when some properties have no provider).
- Supporting code: `app/serializers/connect/` (envelope, paginated_collection, serializers) and `app/queries/accessible_{companies,communities}_query.rb`
- **Derived values, not columns:**
  - A property's lifecycle stage comes from four milestone dates (`date_activated`, `production_started_date`, `submitted_final_approval_date`, `released_date`).
  - A company's status comes from `companies.inactivate`; `companies.locked` is unused (NULL everywhere).
  - Neither the 22-Sep design's 7-stage lifecycle nor its Past Due / Onboarding company states has a column behind it.

**Known dead route:** `namespace :sdk { get "map_config/:property_id" }` has no controller.

---

## 5. Auth and roles

- `users.role` is a string. `User::ROLES` is defined at `app/models/user.rb:62`. The values are:
  - Super admin (displayed as "Pynwheel admin")
  - Company admin
  - Regional admin
  - Community admin
  - Community manager
  - Community assistant
  - Dwelo admin
  - visitor_detail_page
  - New Client
- The predicates `is_super_admin?`, `is_company_admin?`, etc. are at `user.rb:102-163`.
- CanCanCan (`app/models/ability.rb`) covers coarse permissions. Most scoping is done **by hand in controllers**, for example `ApplicationController#check_community` and the role branches in `HomeController#index`.
- Product access is gated by two flags: `pynwheel_launch_access` and `pynwheel_connect_access`. Users with both land on `access_selection.html`.

---

## 6. Legacy CMS UI (what Connect is replacing)

- **Layout:** `app/views/layouts/application.html.haml`, AdminLTE "skin-blue sidebar-mini". Shared partials: `_header`, `_side_menu`, `_sidemenu_communities`, `_breadcrumbs`, `_messages`.
- **Company-level menu:** Communities, All Accounts, Company, Company Data, Company Details, Users, Analytics, SVG Maps Optimizer.
- **Property-level menu** (`_side_menu.html.haml`):
  - Property Details, Logo, Design, Home Page, Settings
  - Floor Plans, Units, Amenities, Property Map, Auto Wayfinding
  - Tour Setup, Tour Stops, Scheduled Tours, Visitors
  - Gallery, Neighborhood, Additional Pages, Favorites & eBrochure
  - Pricing Calculator, Locks, Pynwheel Access Users
  - Data, Partner Configuration, Map URLs
  - Reports, Analytics, CMS Logs, Impressions, Tutorials, SVG Maps Optimizer

---

## 7. Jobs and integrations

- **Code locations:** `app/jobs` (~60), `app/workers` (~35 Sidekiq workers), `lib/tasks/*.rake`. There is no cron file; Heroku Scheduler is presumed to run the rake tasks.
- **PMS providers:** Yardi (2/4/Voyager/RentCafe), RealPage, Entrata, ResMan, PSI, Zaremba, AppFolio, Beans, Rent Manager, generic XML, ApartmentList, Renu.
- **CRMs:** Knock, Funnel, RentCafe, Salesforce, PERQ.
- **Other services:** Stripe, S3, Textract, Google Maps/Places/Sheets, Twilio, Pusher chat, Realync.

---

## 8. Environment

- **ENV names only:**
  - Infra: `GOOGLE_MAPS_API_KEY`, `STRIPE_*`, `TWILIO_*`, `PUSHER_*`, `REDIS_URL`, `BUGSNAG_API_KEY`, `SMTP_*`, `HOST_URL`, `SDK_MAP_BASE_URL`, `SECRET_KEY_BASE`
  - Pynwheel products: `PYNWHEEL_LUANCH` (sic), `PYNWHEEL_ACCESS_BASE_URL`
  - Provider keys: `ENTRATA_*`, `YARDI_*`, `REALPAGESVC_*`, `RESMAN_*`, `KNOCK_*`, `IGLOOHOME_*`, `REMOTELOCK_*`, AWS keys
- **Connect's env vars** are in `pyn-connect-web/.env.example`: `PYNWHEEL_CMS_URL`, `NEXT_PUBLIC_CMS_URL`, `NEXT_PUBLIC_ENV_LABEL`, `PYN_CONNECT_COOKIE_SECURE`. The full-UI branch adds `PYN_CONNECT_REACT_FLOW` and `PYN_CONNECT_SCREEN_HARNESS`.

### Running locally

```bash
# Rails on :3000. Use the RVM ruby; rbenv's 3.3.5 fails with "linked to incompatible libruby"
export PATH="$HOME/.rvm/rubies/ruby-3.3.5/bin:$PATH"
bundle exec rails s -p 3000 -b 127.0.0.1

# Connect on :3001
cd pyn-connect-web && npm install && npm run dev
```

If :3000 is taken (another local app, such as ezofficeinventory, may hold it), run Rails with `-p 3100` and start Connect with `PYNWHEEL_CMS_URL=http://127.0.0.1:3100 npm run dev`.

- **Tests (Rails):** Minitest with fixtures. Coverage is thin. Run `bin/rails test`.
- **Tests (Connect):** `npm run typecheck`, `npm run build`. The full-UI branch adds `npm run test:e2e` (Playwright).

---

## 9. Working-tree hygiene: never commit these without asking

The working tree holds large local-only material. It is deliberately untracked or locally modified:

- DB dumps: `latest.dump*`, `pynwheel-staging.dump` (~6 GB)
- The vendored bundle tree: `gems/`, `cache/`, `bundler/`, `extensions/`, `specifications/`, `build_info/`
- Generated `bin/*` binstubs, and local edits to `bin/rails|rake|spring`
- `config/database.yml` (local credentials) and `db/schema.rb` (local edits)
- `pyn-connect-new.html` (the 20 MB design), `pyn-connect-22-sep-new.html` (its 21 MB Sep 22 revision), `feature1.md`, `feature-whole-ui-next.md`
- `.DS_Store`, and `toc*.list` (left over from the staging restore)

**Hosting:** staging runs on Heroku as two apps: `pyn-system` (Rails) and `pyn-system-connect` (Next.js). Details are in [PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md) §8.

**Standing rule:** no AI attribution in commits or PRs. That means no `Co-Authored-By: Claude` line and no "Generated with Claude Code".

---

## 10. Key documents

| Doc | What it is |
|---|---|
| [react-architecture.md](react-architecture.md) | The frontend architecture. §1–19 describe ezofficeinventory's React SPA. **§20 is the dated log of how it maps onto Connect, and must be kept current** |
| [PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md) | **The** progress and handoff doc: status, decisions, traps, the Heroku deploy, next implementation |
| [feature1.md](feature1.md) | Phase 1 brief (Sign In / Companies / Properties, real data) |
| [feature-whole-ui-next.md](feature-whole-ui-next.md) | Phase 2 brief (full design on demo data) |
| `pyn-connect-new.html` | The design (a bundled page, not plain HTML). PYN_CONNECT_PROGRESS.md §13 explains how to read it |
| `pyn-connect-22-sep-new.html` | The 22-Sep revision of the design, and the target for Companies and Properties since phase 2c. Its differences from the original are listed in PYN_CONNECT_PROGRESS.md §14 |
| [pyn-connect-web/README.md](pyn-connect-web/README.md), [DEPLOYMENT.md](pyn-connect-web/DEPLOYMENT.md) | Connect app readme; Docker/standalone deploy |
| `docs/*.md` | Map SDK plans: map load performance, gallery endpoint, neighborhood endpoint, student-housing popups and unit-space grouping, SVG optimizer |
