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

---

## 13. Property Inventory: implementation knowledge (September 24, 2026)

Added with phase 2e: branch `feature/inventory_implementation` on top of `824c1f07a`, uncommitted as of Sep 24. See PYN_CONNECT_PROGRESS.md §17 and gaps doc §4.

### The flow

```
Properties row "Inv" (Go To)   ─┐
Property Detail → Inventory    ─┼→ /properties/:id/inventory[?tab=floorplans|units|amenities]
                                │     app/(connect)/properties/[propId]/inventory/page.tsx
                                │       numeric id → loadPropertyInventory()   core/repository/remote/propertyInventory.server.ts
                                │         GET /communities/:id/floorplates.json   FloorplatesController#index
                                │         GET /communities/:id/floorplans.json    FloorplansController#index
                                │         GET /communities/:id/units.json         UnitsController#index
                                │         GET /communities/:id/amenities.json     AmenitiesController#index
                                │         (in parallel; 401 → sign in, 302/404 → not found)
                                │       slug → demo PropertyScope + connect/properties/propertyInventory.screen (unchanged)
                                └→ PropertyInventoryScreen → usePropertyInventory / useInventory{Floorplans,Units}
                                     → core/utils/generator/inventory/* → screens/properties/inventory/*
```

### Backend shape (read-only JSON on existing actions)

- **`Connect::InventoryJson`** (`app/controllers/concerns/connect/inventory_json.rb`) is included in the four controllers. For the JSON `index` only, it skips `community_code` (which would create a Tour/SchedulerWidgetSetting) and `load_tour_users_chats`. It renders `{ data, meta: { total_count, current_user, property, … } }`.
- **Authorization** is each controller's existing `check_community`: a company admin gets 302 for another company's property. It is **not** `AccessibleCommunitiesQuery`, which Property Detail uses. The two scopes agree for the roles tested; the controller's own rule is the legacy source of truth for these pages.
- **Serializers** live in `app/serializers/connect/`: `floorplate`, `floorplan`, `unit`, `amenity`, and `upload_url`.

### Data rules worth knowing

- **Units → floor plan** joins on `units.floorplan_id = floorplans.provider_floorplan_id`, not the primary key. The serializer sends both the resolved `floorplan_id` and `floorplan_provider_id`.
- **A floorplate's units** are `Floorplate#fetch_units`: visible units whose `floor` is in `Floorplate#floors`. "Plotted on it" means the unit's `floorplate_id` is that floorplate and it has x/y or an SVG pointer. A floorplate's amenities are those with `amenityable = Floorplate`.
- **Amenity ownership:**
  - none: not placed
  - Floorplate or Sitemap: plotted, and a tour stop when a `tour_stops` row has `stop_type = 'amenity'`
  - Floorplan or Unit: an interior image

  The Amenities tab lists only the first two; interior images are counted on their floor plan or unit.
- **Feed vs Manual:** a field is Manual when its own `*_is_updated` flag is set (`Unit::FEED_OVERRIDE_FLAGS`, and the floorplan `*_is_updated` columns), as the legacy grid colours it. The unit-level `manual_override` is shown as its own pill. Tags appear only for fed records (`provider` present and not `manually`). Units have no sq-ft flag, so Sq Ft carries no tag.
- **Availability:** sold → Sold; `available` false → Not available; `available_date` after today (Eastern) → Available {date}; else Available now. There is no unit "almost gone" (G21).
- **Buttons:** 3 slots, `virtual_tour_button_label/url/link1_open_new_tab`, `additional_button/url/link2`, `scheduler_label/url/link3`. A button counts as configured when it has a URL.
- **Prices:** `market_rent` of -1 or 0 is the CMS's "unset" and reads "Not set".
- **Last sync:** `communities.data_provider_updated_on` is text: a timestamp, or the CMS's literal "Never".
- **Locks:** `AssignLocksHelper#all_locks` reads the Latch / Zerv / Igloohome / EdgeState / Dwelo lock tables (DB only). A lock's `stop_id` is the **door** it opens. The dialog's lock types follow `Community#lock_options`: Manual, plus the vendors present, with Zerv labelled "Pynwheel Access".

### Images

- **Raster `image` columns** (floorplate, floorplan, unit, amenity) come from `standard_image_url` through `convert_to_s3_accelerate_url`, the same URL as `validated_image_url`. It loads in every environment.
- **Uploader-only files** (floor SVG, secondary images, amenity gallery, sitemap, Beans background) use CarrierWave's URL. On staging and production that is S3. In **development** it is a path on the CMS host, because the uploaders use `:file` storage there, so those files 404 locally. The UI shows "Image unavailable" rather than a broken image.
- **Missing S3 objects:** some stored files return 403 from S3 (e.g. property 2919's floor plans). This is a data issue; the legacy page breaks on them too.
- `floorplates.svg_image_url` is a rasterised `svg_for_metro` copy of the image, **not** the SVG.

### Read-only rule (this phase)

- **Dialogs** (Floorplate, Floor Plan, Unit, Amenity, Mass Override) hold local state only. A picked file becomes an object URL and is never uploaded. Save and Apply close the dialog, and the footer says nothing is saved.
- **Delete, Remove and Re-sync** open the shared `ConfirmDialog` with `action: null`. `askConfirm` accepts null, and `doConfirm` then only closes the dialog.
- **Nothing here may send a non-GET.** The UI tests assert it.

### Reusable pieces added

- `molecules/Modal`, `organisms/ImageViewer`, `molecules/RecordCard`, `MediaThumb`, `MetaGrid`, `RangeFilter`, `UploadSlot`, `Breadcrumb`
- `atoms/IconButton`, `SourceTag`, `SafeImage`
- `Switch` with `onToggle`
- `hooks/useClientPages` (page a list already in the browser with the existing pager)

The CSS namespaces are `.bo-inv*`, `.bo-record*`, `.bo-thumb*`, `.bo-meta*`, `.bo-modal*`, `.bo-dlg*` (dialog forms; 2d's `.bo-form` is its inline edit grid, so don't mix them), `.bo-viewer*`, `.bo-upload*`, `.bo-range*`, `.bo-choice*` and `.bo-btn*`.

### Testing without a password

- **Rails:** `rails runner` with `Warden::Test::Helpers` (`login_as(user, scope: :user, run_callbacks: false)`) and `ActionDispatch::Integration::Session`, subscribed to `sql.active_record` to catch any write.
- **UI:** capture the four JSON responses that way, serve them from a local stub, and point `PYNWHEEL_CMS_URL` at it. Set the two Connect cookies to placeholder values; only the stub sees them. Run Connect from an rsync'd copy so the user's dev server's `.next` is not shared.
- **Local DB access now needs** `DATABASE_URL=postgres://zubairzulifqar@localhost/pynwheel_development DISABLE_SPRING=1 OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES` (the local `database.yml` / `bin/*` edits are gone).

**Real ids worth keeping:**

| Id | Why |
|---|---|
| 348 | 4 SVG floorplates, 8 plans with buttons |
| 1625 | Model and sold units, amenity categories |
| 2919 | Locks, tour order; its plan images are 403 on S3 |
| 1232 | Amenity galleries |
| 236 | Sitemap mode |
| 503 | No units |
| 4397 | 1,169 units |
| 3325 | No SchedulerWidgetSetting |

---

## 14. Property Detail and Inventory improvements: implementation knowledge (September 25, 2026)

Branch `feature/properties_inventory_improvments`; PYN_CONNECT_PROGRESS.md §18.

**The prototype files.** `pyn-connect-22-sep-new.html` and `pyn-connect-new.html` are bundled pages: line 380 is a JSON asset manifest (`uuid → {mime, compressed, data}`; gzip when `compressed`), line 392 is the whole markup as one JSON string. `JSON.parse` that line, then cut a screen out with `<sc-if value="{{ isX }}"` and nested-tag counting; the state and render code is the `<script type="text/x-dc">` block. Render bindings for Property Detail sit near `state.js` lines 2454–2613, the inventory (`tcTabs`, floorplates, floorplans, units) at 2734–3130 and 3346–3440, Unit Detail at 3413–3440. The `isTcUnplotted` block is unreachable in the 22-Sep file.

**Rails, Connect JSON (six reads, all Devise-session):** `communities.json`, `communities/:id/edit.json` (also nested under `/companies/:cid`), and `communities/:id/{floorplates,floorplans,units,amenities}.json`. `edit.json` now skips `community_code` / `load_tour_users_chats` like the inventory reads (`CommunitiesController#connect_detail_json?`). Unknown ids are 404 on all of them. There is **no** `units#show`; `units/:id/edit.json`, `floorplans/:id/edit.json` and `settings_page.json` are 406. `units.json` honours every `UnitFilterQuery` param and is unpaginated.

**Two tenant scopes:** `edit.json` uses `AccessibleCommunitiesQuery` (locked own property → 404 for non-super-admins); the inventory reads use `check_community` (company admin → 200 incl. locked, other company → 302). Connect shows "not found" for both 302 and 404.

**New keys.** `units.json`: `lease_terms` (`[{pricing_month, pricing_rent}]`, from `Unit#get_lease_term_pricing_matrix`, which itself checks `communities.display_pricing_options`; rent strings are the model's, e.g. `$1405`), `x_plot`, `y_plot` (pixels on the floorplate image; percent = value / floorplate `width` or `height`; null for SVG-pointer placements). `edit.json`: `inventory.buildings` (distinct `building` over units ∪ amenities — the CMS has no buildings table).

**Frontend.**
- `ConfigRow` kinds: `toggle | value | input | date | select` (`propertyDetail.generator.ts`); the screen renders the last three disabled through `.bo-configrow__control`.
- `MetaItem.control = 'select'` renders a disabled `.bo-meta__select`; `MetaGrid columns="plates"` is the floorplate card's 4 + 1 grid.
- Unit Detail: route `/properties/:propId/units/:unitId` (numeric ids) → `loadPropertyInventory` → `unitDetail.generator.ts` → `useUnitDetail` → `screens/properties/unitDetail.screen.tsx`. It reuses `InventoryDialogs` for Edit Unit. `unitRoute(propId, unitId)` already existed in `connectRoutes.ts`.
- `core/utils/date/cmsToday.ts` is the one place the CMS-zone "today" is computed.

**Local testing.** Mint sessions with `rails runner` (progress §7 script; `EMAIL=… OUT=… `) and give Playwright the two Connect cookies (`pyn_connect_rails_session`, `pyn_connect_user`, URL-encoded). **Wait for hydration** before clicking (`__reactFiber` on a button); a page that never hydrates means `.next` is stale — stop `next dev`, `rm -rf .next`, restart (trap 9). The e2e screen tests need `NEXT_PUBLIC_SCREEN_HARNESS=on` on the dev server and still fail on `fonts.gstatic.com` from this machine.

---

## 15. The placeholder marker (`*`) — what is real and what is not (September 25, 2026)

Every piece of information or setting in the Connect UI that is **not read from the Pynwheel CMS database** carries a small superscript asterisk (`<DemoMark />`, `src/core/components/atoms/DemoMark.tsx`, class `.bo-demomark`, hover text "Placeholder: not read from the Pynwheel CMS database yet").

**Where the marks are today**
- **Whole demo screens** (Dashboard, Company detail / Regions / Groups, Tour Scheduling, Integrations, SVG Maps Optimizer, Partner Configuration, White-Label Builds, Pricing Calculator, Favorites, Resident Access, Live Chat, Analytics, Reports, Users & Roles, AI Services, Billing, Audit Log, Help, and the property screens Map & Plotting, Tour Setup, Branding, Content, Pricing, Units & Floor Plans, plus every slug-id property/unit route): the page passes `demo` to `ConnectScreenTemplate`, which puts the asterisk on the topbar title and shows the amber legend under it, and every panel heading, card title, stat value and setting label in `src/core/screens/connect/**` (including the demo dialogs) has its own `<DemoMark />`.
- **Shell:** the sidebar badges (Tour Scheduling 2, Live Chat 4, AI Services 3 — hard-coded in `navigation.generator.ts`), the notification bell's dot, and every row of the topbar search results (demo data only).
- **No marks** on Sign In, Companies, Properties, Property Detail, Property Inventory and Unit Detail (numeric ids): everything they show comes from Rails.

**Rule when wiring real data:** as soon as a screen or a single setting reads its value through a Rails controller (`format.json` branch → `Connect::*Serializer` → parser → model), delete its `<DemoMark />`; when the whole screen is real, also drop the `demo` flag from its `page.tsx` so the title asterisk and the legend disappear. Do not leave a mark on real data, and do not add real data without removing the mark. The e2e text matchers accept an optional trailing `*` (`/^Title\*?$/`) so tests keep passing either way.

**How the marks were placed:** a one-off codemod over `src/core/screens/connect/**/*.tsx` appended `<DemoMark />` to `div`/`span`/`h*` elements whose inline font is `800 <any>px` or `700 10.5–13px` and whose child is plain text or a single `{expression}`. Nested headings the regex could not see safely were left unmarked; the screen-level title + legend still cover them.
