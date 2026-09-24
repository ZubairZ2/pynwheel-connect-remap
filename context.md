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
| `api/v1` | Pynwheel Tour app: tours, schedule_tours, wayfinding, tour_histories, igloohome/dwelo, perq/salesforce webhooks. Also the Touch kiosk feed `GET /api/v1/communities/:id/data.json` (`Api::V1::BaseController`: **no authentication**, a design/kiosk payload) |
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
  - Params: `page`, `per_page` (default 10, capped at 100 by `Connect::PaginatedCollection`), `q`, and four filters. Each filter takes a comma-separated list (or `[]` array). Values are ORed within a filter; filters are ANDed:
    - `stage`: installed, activated, production, approval, released
    - `company_id`
    - `product`: touch, tour, maps
    - `data_provider`: a provider slug, or `none`
  - `meta`: `total_count` (after search and filters), `pagination`, `current_user`, `scope_total_count` (before them), `filters.companies` and `filters.data_providers` (slugs; `none` when some properties have no provider).
- Supporting code: `app/serializers/connect/` (envelope, paginated_collection, serializers) and `app/queries/accessible_{companies,communities}_query.rb`
- `GET /communities/:id/edit.json` (added Sep 24, §12): `CommunitiesController#edit` → `Connect::PropertyDetailSerializer`. One property in the listing's scope (404 otherwise): the row fields plus profile, milestones, settings, billing, Touch/Tour/Maps configuration, inventory counts and ILS partners. Read-only.
  - *History:* before this, there was no single-record Connect JSON, and the first Property Detail found its row in `communities.json` (§11).
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
- **Connect's env vars** are in `pyn-connect-web/.env.example`: `PYNWHEEL_CMS_URL`, `NEXT_PUBLIC_CMS_URL`, `NEXT_PUBLIC_ENV_LABEL`, `PYN_CONNECT_COOKIE_SECURE`. Phase 2 (now on `main`) added `PYN_CONNECT_REACT_FLOW` and `PYN_CONNECT_SCREEN_HARNESS`.
  - `NEXT_PUBLIC_CMS_URL` also builds the Property Detail "Edit Details" link to the legacy form (`legacyCmsURLs`). Without it the button is hidden.

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
- **Tests (Connect):** `npm run typecheck`, `npm run build`, `npm run test:e2e` (Playwright, since phase 2; the harness needs `PYN_CONNECT_SCREEN_HARNESS=on`).
- **Real-data checks without the password:** mint a Devise session with `rails runner` and set Connect's two cookies. The script and the steps are in PYN_CONNECT_PROGRESS.md §7.

---

## 9. Working-tree hygiene: never commit these without asking

The working tree holds large local-only material. It is deliberately untracked or locally modified:

- DB dumps: `latest.dump*`, `pynwheel-staging.dump` (~6 GB)
- The vendored bundle tree: `gems/`, `cache/`, `bundler/`, `extensions/`, `specifications/`, `build_info/`
- Generated `bin/*` binstubs, and local edits to `bin/rails|rake|spring`
- `config/database.yml` (local credentials) and `db/schema.rb` (local edits)
- `pyn-connect-new.html` (the 20 MB design), `pyn-connect-22-sep-new.html` (its 21 MB Sep 22 revision), and the briefs: `feature1.md`, `feature-whole-ui-next.md`, `properties_detail_feature.md`
- **Not** in this list: `gaps_properties_detail_feature.md`. It is a phase 2d deliverable and belongs in the branch's commit.
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
| [properties_detail_feature.md](properties_detail_feature.md) | Phase 2d brief (Property Detail on real data, no backend changes) |
| `pyn-connect-new.html` | The design (a bundled page, not plain HTML). PYN_CONNECT_PROGRESS.md §13 explains how to read it |
| `pyn-connect-22-sep-new.html` | The 22-Sep revision of the design, and the target for Companies and Properties since phase 2c and for Property Detail since 2d. Its differences from the original are listed in PYN_CONNECT_PROGRESS.md §14 (listings) and §15 (Property Detail) |
| [pyn-connect-web/README.md](pyn-connect-web/README.md), [DEPLOYMENT.md](pyn-connect-web/DEPLOYMENT.md) | Connect app readme; Docker/standalone deploy |
| `docs/*.md` | Map SDK plans: map load performance, gallery endpoint, neighborhood endpoint, student-housing popups and unit-space grouping, SVG optimizer |
| [gaps_properties_detail_feature.md](gaps_properties_detail_feature.md) | What the Property Detail page cannot read from the existing backend, and what each gap needs (Sep 24) |

---

## 11. Property Detail: implementation knowledge (September 24, 2026)

Added with phase 2d (branch `feature/properties_detail_page`, commit `ef9e4549a`; PYN_CONNECT_PROGRESS.md §15). Nothing in the Rails app changed in that version. **The data path below was superseded the same day by §12** (a read-only JSON branch on `communities#edit`); the legacy-flow and convention notes still apply.

### The flow

```
Properties row (click, or its title link)
  → /properties/:id                      app/(connect)/properties/[propId]/page.tsx
       numeric id → lookupProperty()     core/repository/remote/propertyLookup.server.ts
                      → GET /communities.json?per_page=100&page=N   (first page, then the rest in parallel)
                      → parseProperties → the row with that id, or "missing"
       slug id    → demo PropertyScope + connect/properties/propertyDetail.screen (phase 2, unchanged)
  → PropertyDetailScreen → usePropertyDetail → propertyDetail.generator → DetailSection / Switch / StatusPill
```

### The legacy Property Detail, for reference

| Legacy screen | Route → action | View | Persists through |
|---|---|---|---|
| Property Details | `GET /companies/:company_id/communities/:id/edit` → `CommunitiesController#edit` | `communities/edit.html.haml` + `_form.html.haml` | `PATCH …/communities/:id` → `#update` (`community_params`) |
| Settings (products, Touch code, billing, Community Logo, Inactivate) | `GET /communities/:community_id/settings_page` → `#settings_page` | `communities/settings_page.html.haml` | `#update`, `#update_billing_rate` |
| Floorplates page ("Interactive Map" settings: pricing and unit-display flags, Student Housing) | `GET /communities/:id/floorplates` → `FloorplatesController#index` | `floorplates/index.html.haml` | `POST /communities/:id/save_apartment_settings` → `CommunitiesController#save_apartment_settings` |

- **Where the data lives.** Every profile field, setting and billing rate is a column on `communities`. `gaps_properties_detail_feature.md` maps each label to its column.
- **Inventory** comes from `Community` has-many `floorplans`, `floorplates` (ordered `number DESC`), `amenities`, `units` and `sub_communities`. Units belong to a sub-community through `units.property_id = sub_communities.property_id`.
- **Billing rates are free-text strings.** The settings form pre-fills `$2,028` / `$385` / `$295` / `$280` / `$50` when a rate is blank and saves them, so a stored value is not always a negotiated rate. `billing_type` is `annual` on every row.

### What Connect can read, and what it cannot

- **Readable:** only `GET /communities.json`, the listing row: name, city, state, unit count, company, stage, product flags, `tour_published`, data provider.
- **No single-property JSON and no id filter.** Hence the lookup walk: 9 requests for a super admin, 1 for a company admin with a few properties.
- **Ruled out:** `api/v2` (token auth), `/api/v1/communities/:id/data.json` (unauthenticated kiosk feed, no profile fields) and the partner SDK (API key).
- **Scraping the legacy HTML** was rejected. It is brittle, and `ApplicationController#current_company` writes `session[:company_id]` from params, which would switch the legacy session's current company.

### UI and data decisions

- Fields and sections without data are **not rendered**; nothing shows a prototype value. The page therefore shows only:
  - header, Manage This Property and the lifecycle (5 real stages)
  - Profile: Name, City · State, Units
  - Products (read-only)
  - Inventory: Units only
- **Lifecycle order** is the serializer's ranking: installed → activated → production → approval (Final Approval) → released. The demo mock `STAGES` puts approval after released; do not reuse it for real data.
- **"Edit Details"** links to the legacy form via `legacyCmsURLs.propertyDetails` (`config/app/urls.ts`, built on `NEXT_PUBLIC_CMS_URL`). Connect's Rails cookie belongs to the Connect origin, so the CMS may ask the user to sign in there.
- **Row clicks:** `RowDescriptor.href` makes a `CustomTable` row open its record. The title cell becomes the accessible link, and clicks inside `a` / `button` are left alone.

### Conventions for future Property Detail work

- Real-data code sits beside the listing's:
  - `core/screens/properties/`, `core/hooks/`
  - `core/utils/generator/propertyDetail.generator.ts`
  - `core/repository/remote/`
- Demo code stays under `connect/` until phase 3.
- **When Rails gains a detail endpoint** (gap G1), replace `lookupProperty` with a single request and extend `Property` / `parseProperties`, or add a detail model and parser. Then add descriptors to the generator; the screen only renders descriptors. Sections left out today go back in by adding a generator function and a `DetailSection`.
- **Reuse** `DetailSection` for panels, `Switch` for on/off state, `StatusPill` + `STAGE_PILL` for the stage, and the `.bo-linkbutton` / `.bo-stat` / `.bo-profile` / `.bo-steps` classes in `globals.css`.
- **Test** with a session minted by `rails runner` (script in PYN_CONNECT_PROGRESS.md §7). It signs in a user through Warden's session keys; then set Connect's two cookies (`pyn_connect_rails_session`, `pyn_connect_user`).
  - Test as a super admin (all 9 listing pages; property 919 is on the last) and as a company admin (scope: `jleinweber@zaremba.net` sees only 364).
  - Real ids worth keeping: 503 (first row), 1411 (all three products), 1990 (Final Approval), 1107 (no city).

---

## 12. Property Detail under the revised backend rule (September 24, 2026)

The Property Detail brief now allows minimal, read-only JSON branches on existing actions (`properties_detail_feature.md` §9a). PYN_CONNECT_PROGRESS.md §16 has the full record; the gaps are in `gaps_properties_detail_feature.md` §0.

### The flow now

```
Properties row → /properties/:id                    app/(connect)/properties/[propId]/page.tsx
  numeric id → fetchPropertyDetail                  GET /communities/:id/edit.json
               → CommunitiesController#edit          `return render_connect_property_detail if request.format.json?`
               → AccessibleCommunitiesQuery scope    (404 outside it; 401 signed out)
               → Connect::PropertyDetailSerializer   (reuses Connect::PropertySerializer for the row)
             → parsePropertyDetail → PropertyDetail → propertyDetail.generator → usePropertyDetail → screen
  slug id    → the phase 2 demo screen (unchanged)
```

### Existing data sources the JSON reads

- **The legacy Property Details form** (`_form.html.haml`): `address`, `city`, `state`, `zip`, `latitude`, `longitude`, `manual_lat_long`, `phone`, `email`, `website`, `property_manager_*`, `number_of_units`, `is_sitemap`, `description`.
- **The Floorplates page** (`floorplates/index.html.haml` → `save_apartment_settings`): the pricing and unit-display flags and `student_housing_property`.
- **The Settings page** (`settings_page.html.haml`):
  - `community_logo`, `locked`
  - billing rates: the self-tour rate shown is Lincoln/Dwelo/standard by the page's own test
  - Touch: `code`, `is_vertical_app`, `date_installed`, `mdu`, `show_gesture_icons`, `powered_by_btn`
  - Maps flags
- **Model methods and constants:**
  - `Community#community_tour` (the property's own tour; `has_one :tour` can be a visitor's copy)
  - `Community#property_floor_options`
  - `Community#fetch_multi_properties` (sub-communities; units link by `property_id`)
  - `Community::MAP_PARTNERS` / `#partner_map_enabled?` (ILS)
- **Association counts:** `units`, `floorplans`, `floorplates`, `amenities`.

### Decisions and conventions

- **The JSON branch goes on the legacy action that owns the data** (`#edit`), not in a new controller or route.
- **Not `#settings_page`:** it creates a Tour/TourSetting when they are missing, a write on read.
- **No business logic, scope, model, schema or route changed.** The serializer only reads.
- **Scope:** the JSON applies the Connect listing's existing scope, so the page shows exactly what the listing links to.
- **Read-only Connect:**
  - The design's edit forms are built and prefilled from the record; "Save Changes" sends nothing and says so.
  - Toggles are indicators (`Switch` without `onToggle`).
- **Values shown as stored:**
  - Blank rates → "Not set" (never the legacy form's pre-filled defaults); bare numbers get a `$`.
  - Dates render in UTC, so server and browser agree.
  - `web_map_type` / `billing_type` appear as stored where the design's vocabulary differs.
- **Remaining gaps:**
  - R1: 7-stage lifecycle
  - R2: QR codes
  - R3: separate tour start date
  - R4: Maps pins/paths
  - R5: writes, disabled by rule
- **Testing notes:**
  - Minted sessions expire after 8 hours (Devise `timeoutable`).
  - If `config/database.yml` is back to the committed `postgres` user, give `rails runner` a `DATABASE_URL` for your own role instead of editing the file (PYN_CONNECT_PROGRESS.md traps 26–28).
