# Repository context — pynwheel-staging

**Last updated:** September 25, 2026
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
- `GET /automate_plotting.json?community_id=:id` and `GET /automate_plotting/shortest_path.json?community_id=:id&path_type=sorting` (added Sep 25, §16): `AutomatePlottingController` → `Connect::WayfindingSerializer` / the action's own JSON. The pathway graph, elevators, starting points, tour stops, doors and stored OCR text behind the legacy Auto Wayfinding page, and its routing algorithm. Read-only, scoped by `check_community`.
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
| [gaps_map_plotting_feature.md](gaps_map_plotting_feature.md) | What the Map & Plotting screen cannot do read-only (writes, publish, uploads, Textract, the algorithm over local edits), and what each needs (Sep 25) |

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

---

## 16. Map & Plotting: implementation knowledge (September 25, 2026)

Added with phase 2g (branch `feature/map_plotting_auto_wayfinding`; PYN_CONNECT_PROGRESS.md §20; gaps in `gaps_map_plotting_feature.md`).

### The flow

```
Property Detail → Map & Plotting / Inventory → Plotting / Properties → Go To → Map / Unit Detail → View on plan
  → /properties/:id/map                        app/(connect)/properties/[propId]/map/page.tsx
       numeric id → loadPropertyMap()          core/repository/remote/propertyMap.server.ts
                      loadPropertyInventory()  GET /communities/:id/{floorplates,floorplans,units,amenities}.json
                      fetchWayfindingGraph()   GET /automate_plotting.json?community_id=:id   AutomatePlottingController#index
                    → wayfinding.parser.ts + inventory.parser.ts → PropertyMap { inventory, graph }
       slug id    → the phase 2 demo screen (unchanged, `demo` flag)
  → PropertyMapScreen → usePropertyMap (one LocalMapState) → generator/map/* → MapCanvas + MapPanels + MapDialogs
  Run Algorithm → fetch('/api/properties/:id/wayfinding-route')            app/api/properties/[propId]/wayfinding-route/route.ts
                    → GET /automate_plotting/shortest_path.json?community_id=&path_type=sorting   #shortest_path (read)
```

### The legacy Auto Wayfinding page

| | |
|---|---|
| Menu | Tour Setup treeview → "Auto Wayfinding" (`_side_menu.html.haml`), shown when `communities.self_tour && auto_wayfinding` |
| Route → action | `GET /automate_plotting?community_id=:id` → `AutomatePlottingController#index`; `GET /automate_plotting/shortest_path?community_id=&path_type=sorting\|actual shortest` → `#shortest_path` (read-only JSON) |
| Views | `automate_plotting/index.html.haml`, `_floorplate_map` (floor/building buttons, "Start Plotting Hallways", "Run Algo(Animated)"), `_show_map` (one `#map_<floor>` per floor, `#<building>_map_<floor>` with several buildings), `_sitemap`, `_decide_styling` (marker colour/size per theme; offsets `left = (size-25)/2`, `top = 0.8 × size`) |
| JavaScript | `app/assets/javascripts/maps.js` (hallway editor + route animation), `jquery.line.js`, `services/zoomHandler.js`, `panzoom`; the plotting page's `unit-plotting.js`, `door-plotting.js`, `svgHandler.js`, `svgAutoPlotting.js` |
| Writes on that page | `POST /save_hallways_point`, `/update_hallways_point`, `/delete_hallways_point`, `/connect_leaf_point`, `/save_selected_point` (`HallwaysController`); the GET itself saves a hallway (`make_sure_one_selected_hallway`) and may create a Tour (`community_code`). Connect calls none of these |

**What the page shows vs Connect.** The legacy page draws only *tour-stop* units and amenities (`display_stop: true`) plus hallways, elevators, entry/exit points and the tour start. Connect draws every plotted unit and amenity (it is the plotting screen) and marks the tour stops.

### Models and tables

| Table / model | Role | Notes |
|---|---|---|
| `floorplates` (`Floorplate`) | The maps. `range` → `#floors` ("1-5", "1,3", "4", "-1"); `image` (raster, `standard_image_url` copy), `svg_image`, `width/height`, `svg_metadata {width,height}`, `map_ocr_data` (Textract boxes), `building`, `floor_name` | Community order is `number DESC`; Connect sorts by lowest floor. `has_many :hallways, as: :parent`, `:elevators`, `:units`, `:amenities, as: :amenityable`, `:access_points` (Door) |
| `sitemaps` (`Sitemap`) | The one property map of a sitemap-mode property (`communities.is_sitemap`) | Same uploaders, `width/height` ints; units on it have `floorplate_id NULL` |
| `hallways` (`Hallway`) | Pathway nodes: `x_plot`, `y_plot` (float px), `next_points int[]` (ids it links to, stored one way, walked both ways), `selected` (the node the editor chains from), polymorphic `parent` (Floorplate/Sitemap) | 4,108 rows locally. No edge table; weights are Euclidean px |
| `elevators` (`Elevator`) | Vertical connections: one `x_plot/y_plot`, `floorplate_covering_range` → `#floors`, `building`, `duplicate_of`, `has_one :tour_stop` | `Floorplate#fetch_elevators(floor)` = every elevator of the property whose floors include the floor |
| `building_starting_points` | The designated entry/exit per building (`validate_building`), `floor`, x/y, `has_one :tour_stop` | Created by `tours#building_starting_point` (a GET) |
| `tours` (`Community#community_tour`) | The tour start `x_plot/y_plot` (0/0 = none), `starting_floor`, `building`, `building_order`, `sort_hash`, `dotted_line_color` | `has_one :tour` can be a visitor's copy; use `community_tour` |
| `tour_stops` | `stop_type` unit / amenity / elevator / building_starting_point, `stop_id`, `sort`, `display_stop`, `latitude/longitude` (copies of x/y) | The algorithm routes visible stops in `sort` order |
| `doors` (`Door`) | Unit doors, amenity doors and access points (`attached_with` Unit / Amenity / Floorplate / Sitemap), x/y, `sort` | The algorithm targets a stop's door when it has one (`ordered_doors.first` for amenities) |
| `units.pointer_data`, `amenities.pointer_data` | SVG-mode placement `{x_plot, y_plot, tag, id, selector}` in SVG user units | Serialized as `svg_pointer` |
| `bedroom_marker_colors` | Per-bedroom colours | Empty for every property locally; unused by the CMS |
| `paths` / `path_points` | Legacy manual Tour Setup lines (`draw_map_line`) | Not used by auto wayfinding; not rendered by Connect |

### The coordinate system

- **Unit:** every stored `x_plot/y_plot` is a natural pixel of the map's raster image (`floorplates.width/height`, or the file's own size — `Floorplate#floorplate_image_width` falls back to `image.width`; a sitemap uses `sitemaps.width/height`). Nothing is stored as a percentage. Connect converts `pct = px / dim × 100` and lays every marker out as a percentage of the image box, which `MapCanvas` fits inside the 520 px surface at the image's aspect ratio; when the CMS has no size, the loaded image's `naturalWidth/Height` is used (`LocalMapState.measured`).
- **Anchors:** a unit's x/y is the pin point (the legacy pin is drawn at `x − left_margin, y − top_margin` so its tip sits there; Connect centres a circle on it). Hallway nodes, doors, elevators, entry points and the tour start store a 16 px icon's top-left and the legacy lines run from `x + 8, y + 8`, so Connect centres them at stored + 8 (`NODE_ANCHOR_OFFSET`). Amenities are drawn at the stored point on both. Route points from the CMS are offset by +8 for every kind, as `maps.js` does.
- **SVG pointers** are in SVG user units against `svg_metadata`; a pin with a pointer and no raster x/y is placed with those. A floorplate with both files shows the raster by default and a "Floor SVG" toggle.
- **Hallways belong to the floorplate**, not to a floor or a building, so every floor of a range and every building sees the same graph (the legacy page copies the same list into each map). The level in Connect *is* the floorplate.
- **Elevators** appear on every floor in their range at the same x/y; the CMS needs consecutive integer floors for its `floor ± 1` hops.

### The JSON

`GET /automate_plotting.json?community_id=:id` (Devise session; scoped by `check_community`, 302 outside the scope, 404 unknown) → `{ data: { settings, buildings, floor_to_floorplate, hallways[], elevators[], building_starting_points[], tour, tour_stops[], doors[], bedroom_marker_colors[], ocr{} }, meta: { property, current_user } }`. Every coordinate as stored. `ocr` holds only boxes with text, keyed `Floorplate:<id>` / `Sitemap:<id>`, normalised 0..1. `units.json` / `amenities.json` add `svg_pointer` (and amenities `x_plot/y_plot`). `GET /automate_plotting/shortest_path.json` answers the action's own `{path_object, floor_ids, is_multiple_buildings}` (JSON text inside JSON); `parseWayfindingRoute` turns the three shapes (sitemap points object, `[floor, points]`, `[building, floor, points]`) into `RouteLeg[]`.

The concern `Connect::WayfindingJson` skips `community_code` / `load_tour_users_chats` for the two JSON actions, loads `@community` read-only, and adds the `check_community` scope the HTML page never had. `#index` returns before `make_sure_one_selected_hallway`; `#shortest_path` is unchanged.

### Persisted vs temporary

`PropertyMap` (from the server) is never mutated. `LocalMapState` (`core/utils/generator/map/mapState.ts`) holds: `pinOverrides` (placed / moved / `null` = removed), `nodeOverrides` (moved stored nodes), `tempNodes` (junctions), `tempEdges` (connections, any two nodes, across levels), `hiddenNodes` / `hiddenEdges` (stored ones hidden on the page), `chainFrom` (hallway plotting), `startOverrides` (building → node), `planOverrides` (object-URL previews, `removed`), `bedColors`, `autoPlotReport`, `route` (legs + reveal counter), dialogs. All in the level's pixel space, so a temporary pin and a stored pin are comparable. The generators (`generateLevelGraph`, `generatePinItems`, the panel generators) merge the two on every render; the selection panel says which one an item is. A reload restores the stored map.

### Behaviour worth knowing

- **Auto-Plot** runs the CMS's own rule (`set_floorplate_markers_on_map`: a text box longer than 2 characters, `marketing_name.include?(text)`, position `left × width, top × height`, later box wins) over the boxes the CMS already stored; it cannot run Textract. Units only, as the CMS.
- **Run Algorithm (Animated)** is the real CMS algorithm; **Preview with local edits** is `localRoute.ts` (per-floor Dijkstra with nearest-node attachment, stops in tour order, doors as targets, elevator towards floors with more stops, else back to the start). The route reveals one point every 300 ms and switches the level to the leg's floor (`levelForLeg`: floor → floorplate, or the property map).
- **Start Plotting Hallways** mirrors `maps.js`: the chain starts from the map's `selected` hallway (or the selected node), every click adds a junction linked to the previous one.
- **Marker colours:** bedroom tiers from the unit's floor plan (`floorplan_id` = provider id); `bedroom_marker_colors` rows override the design palette when present; the panel also prints the CMS's availability colours the kiosk really uses.
- **Not drawn:** legacy manual `paths`; there is no zoom/pan (not in the design).

### Testing

- `tests/e2e/mapPlotting.spec.ts` runs against a real CMS when `PYN_CONNECT_E2E_RAILS_COOKIE` and `PYN_CONNECT_E2E_USER` hold a minted session (§7 script; `PYN_CONNECT_E2E_PROPERTY` defaults to 2919). It asserts the stored map renders, exercises every tool and dialog, runs both algorithms, and fails on any non-GET request or page error.
- Compare with the legacy page in-process (integration session + Nokogiri on `#map_<floor>` markers and the `#hallways` hidden field), not in a browser: the CMS origin's cookie is httpOnly and cannot be injected.
- Real ids: 2919 (everything), 1264 (15 entry points), 1108 (the brief's "100 moffett": 3 buildings, no hallways), 2003 (OCR, nothing plotted), 348 (pins + SVG pointers, no graph), 236 (sitemap mode).

### SVG delivery, dual-map (Beans) properties and the detector (October 10, 2026)

- **Three map configurations exist in production** (`floorplates`: 1103 with both files, 1423 image only, 224 SVG only). A **Beans / Figma property** (`communities.is_beans_svg`, ~170 of them) draws each floor SVG — units and amenities only, `font-family="Inter"` labels — over one shared `communities.background_svg_image` (`bg.svg` / `optimized.svg`); the two exports share one viewBox. Connect composites them when `is_beans_svg` and a background exist (`backgroundOf`, `backgroundBox`), exactly the renter map's / SDK's rule. Beans places units with `units.pointer_data` and **no `floorplate_id`**: the floorplate is the one covering the unit's floor (`importedLevel`; `Connect::FloorplateSerializer#plotted_here?`).
- **Where a file is read from:** `Connect::UploadUrl` resolves a stored key on the configured bucket, then the record's / property's family bucket, then any bucket the database's recent raster uploads name (`known_buckets`), probing with cached HEADs only when the database names another bucket. Heroku `pyn-system` is configured with `staging-pynwheel` while its `DATABASE_URL` is the production database (`images-pynwheel-cms-v2`). The `plan-svg` route (`?floorplate=` / `?sitemap=` / `?background=1`) answers failures as `{ error, status, file, host }` and the canvas prints them.
- **Which file a two-file floorplate opens on:** `MapLevel.dataSpace` — `raster` when hallways, elevators, entry points, doors or x/y pins are stored on it, `svg` when units sit on its polygons, null when nothing is plotted; `plotLayer` = the user's pick for the level ?? `dataSpace` ?? the page default (SVG). Wayfinding follows the same layer unless the stored wayfinding data is on the image (then the image, and the panel says so) or Detect read the SVG (`wfSvg`).
- **The detector reads the floor file and the shared background together** (`detectSvgStructure(root, background)`): walkway layers (`Walkway(s)` / `Sidewalk(s)` / `Corridor(s)` / `Hallway(s)`, else a generic `Path`), building footprints (`Footprints`, else `Building_outline(s)` / `Outline …`), rooms (`Units`, `Amenities`, …); beside a generic `Path` it also infers corridors inside the footprints and bridges them to the walkway at the doorways (`source: 'both'`); a labelled walkway layer is traced alone. `no-layers` names a flattened export. Real exports: Cypress Terra (floor file = units only; background = `Path` sidewalk + `Building_outline`), John Demo (`BG/Path` + `Building_Outline` + `Units/Floor_N_4` in one file per floor), Jennifer 3659 (`walkway`), Jennifer 3638 (no ids at all), Jennifer 1865 (another site's whole-property export).
- **Testing:** the isolated real-data database is `pynwheel_audit_clone` (launch `rails-new-audit`); the nine production exports live in the session scratchpad and feed `hallways.spec.ts` through `PYN_CONNECT_REAL_SVG_FIXTURES`; the Retry button must be tested with a deliberately broken `svg_image` name (the canvas's pan swallowed its click until October 10).

## 17. Amenities tab: implementation knowledge (September 26, 2026)

Branch `feature/amenities_improvements` (from `feature/map_plotting_auto_wayfinding`); PYN_CONNECT_PROGRESS.md §21; gaps in `gaps_amenities_feature.md`. Target design: `pyn-connect-amenties.html`, which differs from the 22-Sep file only in the Amenities tab and the Amenity modal.

### The flow

```
/properties/:id/inventory?tab=amenities
  app/(connect)/properties/[propId]/inventory/page.tsx → loadPropertyInventory()      (unchanged)
    GET /communities/:id/amenities.json   AmenitiesController#index → Connect::AmenitySerializer
  PropertyInventoryScreen → AmenitiesSection
    useInventoryAmenities → amenities.generator (propertyAmenities → sortAmenities → generateAmenityFilterOptions / filterAmenities → generateAmenityCards)
    InventoryDialogs → AmenityDialog (inventoryForms.generator: amenityForm, amenityTypeOptions, amenityBuildingOptions, amenityLockOptions)
```

### Rails: the amenity form is the source of truth

- **Route → controller → view:** `communities/:community_id/amenities` (`resources :amenities`) → `AmenitiesController` → `index.html.haml` (the "Amenity Images" upload page, with the property-level "Show Amenity Name on Webpages" switch → `communities#update_amenity_toggle` → `communities.show_amenity_name`) and `edit.html.haml` (the form every card field comes from). `update` does `params.require(:amenity).permit!` plus `update_locks`; `destroy` also deletes the amenity's `TourStop` and `VisitedStop`s.
- **Columns behind the design's fields:** `name`, `amenity_type` (`Amenity::AMENITY_TYPE`; `amenty_type` is a dead misspelt column), `building` (free text), `floor` (integer), `video_link`, `video_link_button_label` (default "PLAY VIDEO"; the Realync webhook also writes it), `lock_provider` + `access_code`, `breezway_lock_visible` (**"Show in Stops List"**, default true — despite its name; `CommunityTour` and `Community#filter_tour_stops` drop `false` rows from the self-guided tour's stop list), `description` and `directional_text` (wysihtml5 HTML), `image` (+ `standard_image_url`, crop columns), `tour_visiting_order_number`, `amenityable_*` / `x_plot` / `y_plot` / `pointer_data` (plotting). Galleries: `amenity_galleries` (`image`, `name`, `description`, `sort`). Doors: `doors` (`attached_with = Amenity`, `lock_provider`, `access_code`, `sort`).
- **The form's gates:** the lock fields render only when `communities.enable_locks`; "Show in Stops List", Description and Directional Text only when `communities.self_tour`. The lock select's options are `Community#lock_options(existing_locks_provider(community))`: "Manual" plus each vendor in `multiple_locks_provider` that has a lock account with locks (Latch, Zerv shown as "Pynwheel Access", Igloohome, EdgeState, Dwelo).
- **Lock provider rule:** when the amenity has doors the form shows and updates the first door's `lock_provider` (`Amenity#ordered_doors`: by `sort` under `auto_wayfinding`, else by `created_at`), keeping `amenities.lock_provider` in step; otherwise the amenity's own column. The serializer applies the same rule (`Door.where(attached_with_type: 'Amenity', ...)`, one query per listing).

### `amenities.json` (only these keys are new)

- Rows: `show_in_stops` (`breezway_lock_visible != false`), `lock_provider` (the door rule above; blank → null), `video_link_button_label` (blank → null).
- Meta: `self_tour`, `enable_locks`, `show_amenity_name` (booleans), `lock_options` (`[{id, label}]`, the select's real options without its blank row; Manual only if the vendor lookup raises).
- Not exposed on purpose: `access_code`, `tour_visiting_order_number` (no field in the design), the crop columns.

### Frontend rules

- **Which rows are amenities:** `propertyAmenities` keeps `amenityable` blank / Floorplate / Sitemap; Floorplan- and Unit-owned rows are interior images and stay on their floor plan or unit (§13).
- **Building / Floor** (`amenityWhere`): the amenity's own column first, else the plotted floorplate's `building` / name; a numeric floorplate name reads "Floor N"; nothing → "—" and the "No building" / "No floor" filter option. Floors read "Floor N" because the CMS stores an integer (GA1).
- **Type** options keep `Amenity::AMENITY_TYPE`'s order (from `category_options`), then any stored type outside that list (e.g. "Rooftop Lounge" exists in the DB), then "No type" when some rows have none. A blank type is shown as "No type", not "Other" (the design's `a.category||'Other'` would misreport it).
- **Pills:** Plotted / Not on map from `plotted`; In Stops List / Hidden from Stops from `showInStops`. The `tourStop` flag (a real `tour_stops` row) is still in the model for the map, but the design draws only these two pills.
- **Video:** `videoLink` present → the meta cell is `<a target="_blank" rel="noopener">` labelled with `videoLinkButtonLabel` (else "Play Video"); absent → "None". Opening the stored URL is a plain navigation, not a write.
- **Search** is the design's: one term, `includes` over name + type + building + floor. (Units keep the legacy grid's comma / wildcard grammar; amenities never had a search.)
- **Chips** are "on" when the stored HTML has visible text (tags stripped).
- **Dialog:** `amenityForm` fills every field from the row (`plainText` for the two HTML fields; a new amenity starts with the CMS's "PLAY VIDEO" label and Show in Stops on). Building offers floorplates ∪ units ∪ amenities' buildings plus the stored one; Lock offers `amenityLockOptions` plus the stored provider; both selects are disabled-with-a-note only for the lock when `enableLocks` is off. Save / Add / Cancel close; nothing is sent.
- **Read-only:** View opens the viewer; Replace / Upload open the dialog; Remove image and Delete open `ConfirmDialog` with `action: null`; the header switch is an indicator. The e2e spec asserts zero non-GET requests.

### Testing

- `tests/e2e/amenities.spec.ts` needs `PYN_CONNECT_E2E_RAILS_COOKIE` / `PYN_CONNECT_E2E_USER` (progress §7 mint script) and a running CMS; it skips otherwise. Hydration is awaited on `.bo-inv__tab`. MultiFilter buttons are named "{label}: {shown}" ("Lock: Any Lock"); options are `role=checkbox`.
- **Real ids worth keeping:** 2157 Bowers Residences (19 amenities, Dwelo locks, one hidden from stops, no videos, no galleries), 1106 The Carson (Matterport video links with custom labels, Latch), 1232 Lincoln at Dilworth (galleries: "Sky" has 3 images), 1618 Hazel (videos + galleries + locks + one hidden).

---

## 18. Map & Plotting (plotting design) and Tour Setup: implementation knowledge (September 26, 2026)

Added with phase 2i (branch `feature/map_plotting_tour_setup`; PYN_CONNECT_PROGRESS.md §22; gaps in `gaps_map_plotting_feature.md` (M10–M13) and `gaps_tour_setup_feature.md`). §16 still describes the raster map, the pathway graph and the wayfinding JSON; this section adds the floor SVG, polygon plotting, the Auto Plot wizard and the real Tour Setup.

### The flow

```
Property Detail → Map & Plotting / Inventory → Plotting / Tour Setup → View on Plan
  → /properties/:id/map[?level=floorplate:12&pin=unit:34&arm=1]     app/(connect)/properties/[propId]/map/page.tsx
       loadPropertyMap() (unchanged: the four inventory listings + automate_plotting.json)
       → PropertyMapScreen → usePropertyMap(map, initial) → generator/map/* → MapCanvas (+ SvgPlanLayer) / MapPanels / MapDialogs
       floor SVG: fetch('/api/properties/:id/plan-svg?floorplate=<id>')     app/api/properties/[propId]/plan-svg/route.ts
                    → GET /communities/:id/floorplates.json (scoped) → the plate's svg URL → the file, as image/svg+xml
                    → measureFloorSvg() (utils/map/floorSvg.ts) → FloorSvgDoc { viewBox, targets[] } in LocalMapState.svgDocs
  → /properties/:id/tour-setup                                          app/(connect)/properties/[propId]/tour-setup/page.tsx
       numeric id → loadPropertyMap() → TourSetupScreen → useTourSetup → generator/tour/tourSetup.generator.ts
       slug id    → the phase 2 demo screen (unchanged)
```

### The legacy SVG plotting, traced

| | |
|---|---|
| Page | `GET /communities/:id/floorplates/:fid/plotexp` → `FloorplatesController#plotexp` → `plotexp.html.haml` renders `_svg_or_image_unit_plotting` twice: the image section (raster pins, hallways, doors, "Start Plotting Hallways") and the SVG section (`is_svg: true`) |
| JavaScript | `services/svgHandler.js`: `fetchSVG` (fetches the file, `uniquifySVGIds`, mounts it), `isValidShape` (a shape in a `<g>` of shapes + a trailing `<text>`, not under an outlines / label / text / icon group), `getTheMarkabeSVGShape` (point-in-shape), `getNormalizedMouseCoordinates` (client px → viewBox units through the CTM), `processSvgBlock` (clones the matched shape, fills it with the marker colour, adds the tooltip); `services/svgAutoPlotting.js`: `autoPlotUnits` (`#Units` group → `Building_*` / `Floor_*` groups → polygons; `normalize` strips everything but letters and digits; matches the group's `<text>` label, then the unit's short name, then "variants" with ≥ 0.55 similarity) → `POST /communities/:id/save_pointer_data` |
| Stored | `units.pointer_data` / `amenities.pointer_data` = `{ id, tag, x_plot, y_plot, selector }` — the shape's raw id and tag, its centre in **viewBox units**, or a group selector (`g#R-112 > polygon:nth-child(1)`) when the shape has no id. `floorplates.svg_metadata` = the SVG's own `width`/`height` attributes read on upload (`upload_svg_image`, Nokogiri); the viewBox is what the browser scales, so Connect reads it from the file |
| Ids | Illustrator escapes an id that is not an XML name: `_x32_` is "2", `_x31_0` is "10", `_x34_7_00000017…_` is "47" with a uniqueness suffix. `decodeIllustratorId` gives the design's "polygon ID"; the raw id is what `pointer_data.id` holds |

### The plot targets (`utils/map/floorSvg.ts`)

`measureFloorSvg` parses the text, mounts a copy off-screen at its own viewBox size (so `getBBox` + `getCTM` answer in viewBox units), and collects the plottable shapes: every `polygon | path | rect | circle | ellipse | polyline` with an id, plus every named group holding shapes without ids of their own (the `g#R-112 > polygon` form the legacy auto-plot saves), inside a `Units` group when the file has one, never under outline / label / text / icon groups. Each target carries `code` (decoded id), `rawId`, `groupId`, `selector`, the sibling `<text>` label, its centre and box. `pointerTarget` resolves a stored pointer by raw id, then selector / group, then the box the saved point falls in.

### Two layers, two coordinate spaces

A level draws either its **floor SVG** (`space: 'svg'`, viewBox units) or its **floor image** (`space: 'raster'`, image pixels), never both at once: the two files do not share a frame (1468: 2942×1942 image, 1412×912 viewBox; 2934: a square 2000×2000 SVG over a landscape image). `activeSpace(level, state)` picks the SVG when the level has one (a "Floor SVG / Background image" toggle when it has both). Every placement, temporary node and override carries its `space`; `generateLevelGraph(…, space)` draws only that space's records. Hallways, elevators, entry points, doors, the tour start and the CMS route are image-space records (the CMS plots them on the image section), so they draw on the image layer; Manual Plot and Auto Plot produce SVG-space placements (`PinOverride { space: 'svg', polygon }`); Place Pin / Junction drop into whichever layer is shown.

### Manual Plot, Auto Plot, the panel

- **Manual Plot** is the `plot` tool: tick items in To Plot (`plotSel`), click a polygon → `dropOnPolygon` writes one override per item at the polygon's centre with its code; a click on empty plan with one armed item places it there (the old Place Pin). Clicking a polygon with the tool off opens its popover (what sits on it, Unplot). The Plotted tab ticks items for "Unplot n items".
- **Auto Plot** (`utils/map/autoPlotRules.ts`, a port of the design's `apAnalyze` / `apSuggest` / rules): scope = this floorplate / all in the building / all in the property; each level's unplotted units (`unitNumber` = `marketing_name`, floor, building) against its targets' codes *and labels*; rules rewrite either side (`{unit}`/`{id}`, `{digits}`, `{letters}`, `{floor}`, `{floor2}`, `{stack}`, `{stack3}`, `{bldg}`; find & replace in order; trim; pad; prefix; suffix; ignore separators / leading zeros / case); a manual pick per unmatched row; "Suggested" tries the design's pattern list. Result → overrides + `autoPlotReport`; rules remembered per building on the page.
- Levels' progress (`generateLevelTabs`): items whose plotted level (else floor + building) is the level; Done / n/m / No units / No SVG / No plan. `levelForFloor` prefers a floorplate of the unit's building when several cover the floor.
- Tour Setup's **View / Plot on Plan** opens the map with `?level=&pin=&arm=1`: `usePropertyMap(map, initial)` starts on that level with the pin selected, or armed.

### Tour Setup

| | |
|---|---|
| Legacy pages | sidebar "Tour Setup" treeview (`_side_menu.html.haml`): Settings (`tours#settings`), Tour Stops (`tours#index`: building / floor buttons, Add Amenities / Add Units selects, the sortable stops table with eye (`display_stop`), draw path, edit, delete; ADD STARTING POINT, BUILDING ENTRY / EXIT, ADD ELEVATOR), Auto Wayfinding; elevators on `elevators#index` / `#edit` (`_edit_elevator`: name, description, directional text, covering range, building, lock type / code / lock, Latch banks in `_elevator_bank_block`, the gallery) |
| Data | `tour_stops` of `Community#community_tour` (`tours.where(tour_user_id: nil).last`) in `sort` order — all of them, hidden ones too; the records behind them (units.json / amenities.json / the wayfinding JSON's elevators and building starting points); elevators with `description`, `gallery` (`elevator_galleries`) and `banks` (`elevator_banks`) — the only JSON added this phase (`Connect::WayfindingSerializer#elevators`) |
| Talking point | `TourStop#stop_directional_text`: `units.stop_description`, else `directional_text`, else `description`; HTML shown as plain text, editable on the page (gap T2) |
| Counts | Tour Stops = stops on the community tour; Elevators & Locks = elevators; Routing = stored hallway connections (`Σ next_points`) |
| Local state | `TourLocalState` (`generator/tour/tourSetup.generator.ts`): stops (order, `visible`, `talkingPoint`, `duration`, `removed`, `local`), `gated`, `photos` / `photoOrder`, `removedElevators`, `localElevators`, the route inputs, dialogs. `initialTourState(map)` rebuilds it from the stored tour; nothing is sent |
| Routing | `utils/wayfinding/stopRoute.ts`: every stop (its door, else its pin), elevator and entry point attaches to the nearest hallway node of its level; hallway links weigh their pixel length; an elevator serving two floors is a zero-length link between its two nodes; Dijkstra from stop to stop → legs, hops, pixel length, floor / building changes, elevators ridden. Building Starting Points reuse `generateStartPointRows` |

### Development-only trap

CarrierWave stores to disk in development (`storage Rails.env.development? ? :file : :fog`) while this database was restored from staging, whose files are on S3. Floor images are fine (`standard_image_url` is the S3 copy); floor SVGs, elevator images and galleries are not on disk, so the CMS host answers 404. The `plan-svg` route falls back to the S3 copy beside the floorplate's image (`bucketOf` + `uploads/<kind>/svg_image/<id>/<file>`); photos show "Photo unavailable". On staging and production the uploader's own URLs are the S3 URLs.

### Testing

- `tests/e2e/mapPlotting.spec.ts` (1468 with SVG: polygons, Manual Plot, the wizard's four steps, Publish, Add Floorplate, Remove Plan, Grid, Junction; 2919 raster: the pathway tools, both algorithms) and `tests/e2e/tourSetup.spec.ts` (2934: reorder, hide, edit, add, remove, gate, add bank, remove, route, publish), both real-data, both asserting 0 non-GET requests. Session env as §13.
- Real properties for this screen: **3837 Sylo** (floor 1 SVG with ids A102…, 84 unplotted units → the wizard's exact-match case; floors 0, 2–4 plotted by pointer), **1468** (floor SVG + image + 20 hallways + 4 elevators, 3 pointer units), **2934** (Tour Setup: 20 stops, 4 elevators, Latch bank, gallery, 2 entry points), 4397 (1087 pointers), 2919 / 1264 / 236 as in §16.

## 19. Images, loading, the floorplate strip and hydration: implementation knowledge (September 27, 2026)

Added with phase 2j (branch `feature/inventory_properties_issues`; PYN_CONNECT_PROGRESS.md §23; gaps updates in `gaps_amenities_feature.md`, `gaps_map_plotting_feature.md` M13 and `gaps_tour_setup_feature.md` T7).

### Upload URLs

`Connect::UploadUrl` is the one place the JSON turns a CarrierWave column into a URL:

- `image(record, base_url, bucket:)` — the main `image`: the stored `standard_image_url` (S3, copied by `StandardUrl#set_standard_url` after every upload, served through `S3Acceleration`), else `upload`.
- `upload(record, column, base_url, bucket:)` — any other mounted upload: `uploader.url`; **when the uploader is on file storage (`uploader.class.storage == CarrierWave::Storage::File`, i.e. development) and the stored file is not on disk (`uploader.file.exists?` false), the same key on the bucket** (`"#{bucket}#{uploader.url}"`, the path fog writes to). `bucket` is an S3 base or a resolver.
- `bucket_hint(community)` — a memoised lambda: the S3 base of the first `standard_image_url` among the property's floorplates, amenities, units and floor plans; at most one query per listing, only when a file is missing. `bucket_of(record, fallback)` prefers the record's own `standard_image_url` bucket (the gallery photo beside its amenity's image, the SVG beside its floorplate's image).
- On fog storage (`on_fog?`, staging / production) `reachable_copy` runs instead: when the family's bucket differs from the configured `S3_BUCKET_NAME` (the Heroku staging CMS: `staging-pynwheel` configured, a production database copy on `images-pynwheel-cms-v2`), a HEAD of the configured URL and then of the family's copy decides, cached in `Rails.cache` for a day; a check that cannot be made keeps the configured URL. Same bucket → no network at all.
- Nothing else about images changed. A production CMS whose bucket matches its records never takes either branch. A key on a bucket without public-read (`staging-pynwheel`, HEAD 403) fails in every UI, including the legacy one.

The `plan-svg` route now only proxies the URL the floorplates listing names (its own bucket guess is gone).

### Loading

`LoadingIndicator` (`core/components/atoms`): the old CMS `loader.gif` (copied unchanged to `public/images/loader.gif`) on a white disc with a caption; variants `page` (route `loading.tsx`: a fixed veil over the whole screen, sidebar and top bar included, `rgba(23, 26, 33, 0.32)` like the legacy `.divLoading`, the disc pinned to the exact viewport centre and the caption hung under it, z-index 390 so a dialog still wins, and no fade-in: the router swaps a route's loading boundary for a nested one mid-load and a restarted fade would blink the veil), `block`, `inline` (wizard note, Routing…), `cover` (the viewer stage, the map canvas: the same veil and centring inside the stage), `overlay` (thumbnails: animation only, light veil). It fades in after 200 ms and hides the animation under `prefers-reduced-motion`. `useImageStatus(src)` gives every `<img>` a loading / ready / failed status per `src` (with a mount-time `complete` / `naturalWidth` check for images that finished before hydration); give the `<img>` `key={src}`. A "could not be loaded" label is only ever the result of `onError` or a request that failed.

### The floorplate strip

`.bo-map__levels` is a single `flex-wrap: nowrap`, `overflow-x: auto` row inside `.bo-map__levelswrap`; the arrows scroll by one visible page, `onScroll` re-measures (state changes only when an arrow's answer changes), and an effect scrolls the selected tab into view on `state.levelId` (deep links). The earlier phase's `.bo-map__levels { flex-wrap: wrap }` rule was the cause of the vertical list; do not reintroduce a second definition. A floorplate card reads "No SVG · plotted/total" whenever it has no floor SVG (image or not), "No plan" when it has no file at all.

### The tour dialogs

`Modal` with `className="bo-tour__dialog"`: 22/24 px head and body, 18 px title, 16 px field gap, footer `flex-wrap: nowrap` with the read-only note first and 42 px buttons; below 560 px the note wraps to its own row. `dwellTimeProblem` (`tourSetup.generator.ts`) is the dialog's validation; `useTourSetup` exposes it as `dialogProblem` and `saveDialog` refuses an invalid dwell time.

### Hydration

`cz-shortcut-listen="true"` on `<body>` is added by the ColorZilla extension; React 19 flags it as a mismatch. In a clean browser the four screens hydrate with no warnings and no body attributes (`hazel.spec.ts` asserts it). No `suppressHydrationWarning` was added; nothing in the tree renders client-only values.

### Verifying locally (traps met on Sep 27)

- The shell's ruby is 3.1.4; the CMS needs 3.3.5. Mint sessions and run `rails runner` with the 3.3.5 toolchain on `PATH` / `GEM_HOME` / `GEM_PATH` (`~/.rvm/rubies/ruby-3.3.5/bin/ruby -S bundle exec …`).
- A minted Devise session expires after a day or so; a smoke that suddenly lands on `/sign-in` means re-mint, not a regression.
- `next dev` (:3001) and puma (:3000) do not survive between sessions; `.claude/launch.json` (ignored) starts both.
- ColorZilla-style extensions make the hydration warning; test hydration in a clean profile.

## 20. Inventory on demand and listing sorting: implementation knowledge (September 30, 2026)

Added with phase 2k (branch `feature/plotting_sorting_inventory_perf`; PYN_CONNECT_PROGRESS.md §24, with the before/after measurements).

### Inventory: the units listing is read on demand

- `loadPropertyInventory(cookie, id, { units })` fetches floorplates, floor plans and amenities always, units only when `units` is true (the default). The **Inventory route passes `units: tab === 'units'`**; Map & Plotting, Tour Setup and Unit Detail keep the full load (they draw every unit).
- Without units, `PropertyInventory.unitsLoaded` is false, `units` is `[]`, `dataProvider` / `lastSync` / `lockDevices` are empty, and `unitCount` comes from `floorplates.json` `meta.unit_count` (`UnitFilterQuery.new(community).results.count`, the exact row count `units.json` answers). Any code that reads `inventory.units` on an Inventory screen must check `unitsLoaded` first; tab counts use `unitsLoaded ? units.length : unitCount`.
- `usePropertyInventory` owns the inventory state and `loadUnits` (GET `APP_API.inventoryUnits` → `app/api/properties/[propId]/inventory/units/route.ts` → `loadInventoryUnits` → the same parser). It runs when the Units tab or a dialog with `dialogNeedsUnits(kind)` (all but the floor plan form) first needs units; a second trigger joins the in-flight request (`unitsRequest` ref); 401 → Sign In; a failure stays until Retry. The screen is keyed by property id.
- Next's production prefetch of the listing's Go To links stops at `loading.tsx` and never runs the page loader: it is not a source of CMS reads (checked in the Rails log). `next dev` does not prefetch at all, so measure prefetch behaviour on a `next build` (use a copy with `node_modules` symlinked; a build inside `pyn-connect-web` breaks the running dev server's `.next`).

### Listing sorting (Companies, Properties)

- Server-side, whole list: `sort` / `dir` travel on the URL, the page validates them (`parseListingSort` against `COMPANY_SORTABLE` / `PROPERTY_SORTABLE`) and passes them to `companies.json` / `communities.json`. Rails: `ListingSort` (`app/queries/listing_sort.rb`) applies `<expr> ASC|DESC NULLS LAST` then the default order; anything not whitelisted is the default order. Keys: companies `name`, `status`, `pms_provider`, `properties`; properties `name`, `company`, `data_provider`, `status`.
- Each SQL expression sorts on what the cell shows: provider slugs through `ListingSort::PROVIDER_LABELS` (keep it in step with `providerLabel` in `companyListing.generator.ts`), property status by lifecycle rank (same precedence as `PropertySerializer#stage`), the company Properties count with the serializer's `real_properties` count.
- Keep SQL built from relations (`to_sql`) out of constants: it needs a DB connection at class load. `AccessibleCompaniesQuery.sorts` is memoised for that reason.
- Frontend: `listingSort.ts` (cycle new → asc → desc → default), `ColumnDescriptor.sortKey`, `CustomTable` header button + `SortIcon` + `aria-sort`. A sort change resets the page; search, filters and paging keep the sort.

### Map & Plotting follows the design exactly (user decision, Sep 30)

The screen shows only what `pyn-system-plotting.html` shows: Building row, floorplate strip, "{floor} · n of m plotted" + Auto Plot + Manual Plot, the canvas, the Plot Units & Amenities panel. Grid, the Floor SVG / Background switch, Publish, Pathways & pins, the plan bar, the read-only banner and the other side panels were removed from the UI (PYN_CONNECT_PROGRESS.md §24 lists them). Do not bring them back from an older brief without asking.

- Floors with both files open on the SVG (`initialLocalMapState(…, 'svg')`); `state.layer` only changes through the SVG-failed fallback ("Show background image").
- Manual Plot on a floor image: turning it on arms the next unplotted item; a click drops its pin. Ticking several items only works on SVG polygons.
- `generateBuildingPills` returns one selected pill for a one-building property; a click on the active pill does nothing.
- The plan is inset `PLAN_INSET` (24 px) inside a white canvas.
- `usePropertyMap` still carries the pathway / route / grid / publish logic and the `wayfinding-route` handler still exists; nothing in the UI reaches them.

### Tests

`tests/e2e/listingsAndInventory.spec.ts` (same session env as `hazel.spec.ts`; `PYN_CONNECT_E2E_JOHN` defaults to 1411). `hazel.spec.ts` "Loading" slows Map & Plotting, not Inventory: the Inventory route is now too fast for the veil to be observed after a pre-first-byte delay.

## 21. Map & Plotting canvas: zoom, markers and labels — implementation knowledge (October 1, 2026)

Added with phase 2l (branch `feature/map_zoom_labels_pins`; PYN_CONNECT_PROGRESS.md §25 has the legacy trace and the measurements).

### Viewport

`MapCanvas` owns a `View { scale, x, y }`: `scale` is relative to the fitted plan (1 = fit inside the canvas less `PLAN_INSET`), `x` / `y` move the plan's centre in canvas pixels. It is applied as a CSS `transform` on `.bo-map__plan`, so the SVG, its polygons, the overlay labels, pins, nodes and edges (all positioned as percentages of the plan) move as one — no overlay keeps its own coordinate space. Limits `MIN_ZOOM 0.5` … `MAX_ZOOM 8`; buttons step ×1.3 about the canvas centre (the legacy `BUTTON_ZOOM_STEP`); the wheel zooms about the pointer through a native non-passive listener (React's `onWheel` is passive and would let the page scroll); dragging the empty canvas in Select mode pans (a move under 3 px is a click and clears the selection as before); `bound()` keeps a tenth of the plan in view (legacy `boundsPadding 0.1`); Reset is `setView(DEFAULT_VIEW)` — no reload, no request; a floor or layer change resets. The polygon popover is placed in canvas space (`toCanvas`) so it does not scale. `pointerPx` in the hook reads `planRef`'s rendered box, which includes the transform, so drops and drags stay exact at any zoom. Tests read `data-scale` on `[data-testid="plan"]`.

### Markers

`MapMarkers.tsx` holds the legacy glyphs as inline SVG (Font Awesome paths): the location marker with its tip on the point, the green door plus, the amenity square with a camera, the hallway `dot-circle`, the door, the red tour start. Sizes are in image pixels × `k` (plan px per image px), so they scale with the map like the legacy panzoom container. Colours come from `PropertyInventory.markers` (`floorplates.json` `meta.markers`, `Connect::MapMarkers`): change the theme logic there, never in the frontend. Rules: a placement on an SVG polygon draws **no marker** (the filled polygon is the placement, as the legacy clone); the plus appears only when `markers.autoWayfinding && inventory.selfTour` and the item has no door (`LevelPin.hasDoor`); edges are 1px black (`vectorEffect: non-scaling-stroke`); no permanent label chips — a selected marker names itself; never print coordinates.

### SVG polygons and labels

`collectTargets` scopes to the `Units` and `Amenities` layers when the file has them (legacy `getValidShapeCategory`), else the whole document minus outline / label / text / icon layers. `PlotTarget.code` is what the map calls the polygon: the group's printed `<text>` (`label`), else the group's name, else the shape id — a generated id (`GENERIC_ID`: `Vector_…`, `Group_…`, `path…`) never wins over a named group. **Identity is `PlotTarget.key`** (`rawId ?? selector`), used for `pinOverrides[].polygon`, `selPoly`, `polyHover`, `itemsByPolygon` and the SvgPlanLayer hover; several shapes can share a code. The canvas prints an overlay label only when the SVG has no text for the polygon (`showCode`, while active) or when the plotted item's name differs from the polygon's text (`assigned`, `sameName`). `SvgPlanLayer` sets `data-plotted` / `data-selected` on the shapes and applies `markers.svgFontFamily` to `text` / `tspan`. Auto Plot only receives targets whose `category !== 'amenity'`.

### Verifying

- `tests/e2e/mapCanvas.spec.ts` serves `tests/e2e/fixtures/floor-labels.svg` (a small file in the shape of the CMS's real exports) for the SVG property's first floor; the real John Demo floor 1 file lives on the public bucket at `uploads/floorplate/svg_image/4230/1785636792-optimized.svg` and can be served the same way for a manual check.
- After an `rsync` into the verify copy while `next dev` is compiling, pages can answer `__webpack_modules__[moduleId] is not a function` (client-rendered fallback, a page error in the tests); restart the dev server with `.next` removed. Not a code fault.

## 22. Map & Plotting: the Wayfinding mode, Plot on Map and Additional Stops — implementation knowledge (October 1, 2026)

Added with phase 2m (branch `feature/wayfinding_plot_on_map`; PYN_CONNECT_PROGRESS.md §26 has the matrix, the data map and the measurements; gaps M14–M19 in `gaps_map_plotting_feature.md`, T8 in `gaps_tour_setup_feature.md`). Reference: `wayfinding-tour-app.html` — a bundled page; its screen lives in the gzip/base64 manifest (`script[type="__bundler/manifest"]` + `__bundler/template`), decode it to read the markup and the `wf*` / `NAV_TYPES` / `WF_TOOLS` logic.

### The flow

```
/properties/:id/map  (unchanged loader: inventory listings + automate_plotting.json)
  PropertyMapScreen → usePropertyMap(map) ── composes ──▶ useMapWayfinding({ state, patch, rasterGraphs, … })
     ModeSwitch (Plotting | Wayfinding)   shown when settings.selfTour && settings.autoWayfinding
     plot  : Auto Plot · Manual Plot · PlotPanel ("Plot on Map")
     wayfind: WayfindingToolbar (Detect Paths ▾, Move / Connect / Add Point / Erase, Clear) · WayfindingPanel
     MapCanvas (one canvas) ── wayfind ──▶ WayfindingLayer (paths, points, links, stops, blockers, route, RouteDot)
     MapDialogs → AddStopDialog
  pure: wayfindingGraph.wayfindingPlate → wayfindingRoute (routeGroups / defaultPair / computeWayfindingRoute / sampleRoute)
        detectPaths · wayfinding.generator (descriptors, stop-form validation) · stopTypes
```

### Rules worth knowing

- **One state.** Everything is in `LocalMapState`; Wayfinding edits write the pathway fields the phase 2g tools used (`tempNodes` `j:` points, `tempEdges`, `nodeOverrides`, `hiddenNodes`, `hiddenEdges`) plus `wfLinks` (`${levelId}|${stopKey}` → point), `wfEdited`, `tempStops` (`n:` keys). `generateLevelGraph` merges them with the stored graph, so the panel, the tabs, the canvas and the routes always agree. Any graph edit clears `wfRoute` / `wfAnim`.
- **The image, not the SVG.** `activeSpace` returns `raster` in Wayfinding when the level has an image; hallways, elevators, entries, doors and stops are image-pixel records. Stops are always placed on the image; arming a stop while plotting on an SVG switches to Wayfinding.
- **Attachment = nearest point** (`ShortestPath`), door first; linked = that point has ≥ 1 path. An SVG-only unit with a door still attaches (its door is on the image). `WfAnchor.svgOnly` marks the rest.
- **Stacks.** `level.floors.length > 1` (from `floorplates.range` via `Floorplate#floors`). Copies `levelId@floor` share points / paths; `WfAnchor.floors` / `WfStop.floors` null = every floor (single floor, no floor, or a record covering the whole stack — `floorsOn`). Plot on Map's "All N floors" lists shared stops only, as the reference.
- **Multi-building.** A level shows an elevator / entry / tour start whose floors overlap it, unless the record is named for another floorplate's building (`belongsElsewhere`). Buildings scope adds an outdoor link between entry / exit stops of different buildings.
- **Vertical links.** Same elevator record on two copies; temporary Elevator / Stairs stops by type + name (an added Elevator named like a stored one rides with it); served floors (`parseServedFloors`, "Lobby" = 1) restrict temporary ones. Weights are the reference's (50 + 10·Δfloors elevator, 90·Δ stairs, 500 outdoor) scaled from its 760 × 470 plan to the floor image's diagonal; blockers cut links within 30/760 of the image.
- **Detect Paths** is a proposal from the stops' positions (spine along the long axis, widest gap across it); `wfReview.snapshot` is the Undo.
- **Toasts / state updaters.** Compute from the render's `state` in handlers; never return values out of a `setState` updater (React may defer it — `toggleEdge` once did).

### Real ids for this screen

1839 Oeuvre (floorplate 2364 `1-6` with 35 hallways, 278 units across 6 floors, 2 elevators; 3022 `7-10` with no paths), 1234 Alderwood (Floor 2: 117 plotted units, no hallways → Detect; 19 buildings + entry points), 1105 Trestle (two floorplate buildings, Buildings scope), 2919 Sofia (single floors), 3136 / 1034 / 2000 (more stacks), 1618 Hazel (31 floorplates, performance).

### Testing

`tests/e2e/wayfindingLogic.spec.ts` needs no server (fixtures through the pure functions). `tests/e2e/wayfinding.spec.ts` uses the §13 session env and the property env vars in its header; every test asserts 0 non-GET requests. Click empty plan spots through `elementFromPoint` (pins and stops cover much of a dense floor).

## 23. Map & Plotting: Detect Hallways, Auto-Connect, the POC's editing and A* — implementation knowledge (October 1, 2026)

Added with phase 2n (branch `feature/wayfinding_detect_hallways_auto_connect`; PYN_CONNECT_PROGRESS.md §27 has the POC mapping, parity numbers and measurements; gaps M16, M20–M23). It supersedes §22's "Detect Paths is a proposal from the stops' positions" (`detectPaths.ts` is gone) and §22's "the image, not the SVG" for floors whose hallways were detected from their SVG.

### The flow

```
Detect Hallways ▾ (WayfindingToolbar) → useMapWayfinding.runDetect(scope)
  for each floorplate (detectScopeLevels), one per frame, wfDetect rows updated as it goes:
    has paths (stored h: or page j:) and not replacing → 'existing'      no svg → 'noSvg'
    fetchSvgText (svgDocs copy, else GET /api/properties/:id/plan-svg?floorplate=)
    import('hallways/floorEngine') → parseSvgTree → detectHallways(root, stops)
        detectSvgStructure ─┬─ walkway layer → flattenShapes → buildWayfindingGraph → bridgeComponentGaps          (POC, exact)
                            └─ Footprints − rooms → inferCorridors → buildWayfindingGraph('inferred') → short bridges   (Phase 1B)
        → dropShortComponents → snapStopsToGraph → autoConnectNodes → splitParallelEdges
    detectionPatch → tempNodes (space 'svg', source/review/confidence) + tempEdges (points, kind) + wfLinks + wfSvg[level]
editing: plateGraph(plate) → POC op (hallways/editing.ts, autoConnect.ts) → graphPatch → LocalMapState overrides, wfUndo push
routing: wayfindingRoute.computeWayfindingRoute → hallways/astar (heuristic only for This Floor) → legs along path polylines
```

### Rules worth knowing

- **Frames.** `wayfindingSpace(level, state)`: `'svg'` when the level has an SVG and either no image or `state.wfSvg[level.id]` (set by detection); else `'raster'`; null with no plan. `activeSpace` returns it in Wayfinding; `generateWayfindingGraphs` builds every level on its own layer (`rasterGraphs` still feeds Tour Setup / publish / start points). Never mix coordinates between layers: there is no transform (gap M20).
- **Anchors on the SVG** sit at the polygon's centre — `FloorSvgDoc.targets` for the loaded floor, `elementCentres(root)` (by `pointer_data.id`, else `selector`) during detection — because stored pointer `x_plot/y_plot` can be elsewhere (M22). `WfAnchor.offLayer` (was `svgOnly`) = no place on this layer; `WfAnchor.polygon` is the target key.
- **Page edges carry geometry.** `TempEdge.points` = interior polyline from `a` to `b`, `kind` ∈ traced / inferred / bridge / knn / manual / stored. `LevelEdge.points/kind`, `WfPath.points` (ends included) / `length` / `kind`. Routing weights by `length`; `generateWfLayer` draws `d`. One edge per point pair (`edgeKey`): the POC's parallel routes are split at a middle vertex (`splitParallelEdges`).
- **Page points carry provenance.** `TempNode.source` (vector / inferred / manual), `review` (pending / confirmed), `confidence`. A drag confirms (`onDragEnd`); "Confirm N above 0.9" (`REVIEW_THRESHOLD`) uses `confirmNodesAboveConfidence`. Routes over pending points warn rather than refuse (the POC refuses).
- **All graph edits go through `edited()`** in `useMapWayfinding` (marks the level, pushes `snapshotOf(current)` onto `wfUndo`, max `WF_UNDO_LIMIT` 50, clears the route) or `applyOp(op)` for the POC's operations (diff written by `graphPatch`). Drags keep the pre-drag snapshot in `dragging.before` and push it only if the pointer moved. A detection run pushes one entry and records `undoDepth`; its card Undo restores `wfDetect.snapshot`. `undo()` restores `WfSnapshot` fields only.
- **Tool state.** `wfTool: WfTool | null`, default null; `setTool` toggles. Null = the POC's gestures (point drag / double-click delete; plan click add + connect; path drag bend (`dragging.kind === 'bend'`, 4 px slop, `wf-bend` preview) / double-click delete). With a tool on, `onPointDoubleClick` / `onPathDoubleClick` / the add-on-click do nothing. In Wayfinding, `SvgPlanLayer` is `passive` so polygon clicks reach the gestures.
- **Skip rule.** A multi-floorplate run never touches a floorplate with points (stored or page). "This floorplate" with points asks first (`detect.replaceTitle`) and hides the stored points on the page.
- **Obstacles** for Auto-Connect / new points / bends come from the floor's SVG (rooms + footprints, or the POC's obstacle layers), computed in the background when the SVG floor is in view and cached per level and text (`obstacles` ref); the floor image has none.
- **Bundle.** `hallways/floorEngine.ts` (layer detection, path parsing, inference, graph build, bridging, snapping) is only reached through `import()`; editing, Auto-Connect and A* are in the page bundle.
- **Stops on the SVG.** `TempStop.space`; `armStop` / `placeStops` use the level's Wayfinding layer; stored elevators / entries / doors stay image-only, so a cross-floor route through an SVG floor needs Elevator / Stairs stops added there.

### Traps

- The overlay SVG's viewBox is `0 0 100 100`: `getTotalLength()` of a path in tests is in percent units.
- Points on a detected floor overlap; pick test targets with `elementFromPoint` (`topPoint`, `pathSpot`, `planSpot` in `wayfinding.spec.ts`). The old `emptySpot` only recognises the image plan.
- Two buttons are named "Undo" when the run card is open: use `data-testid="wf-undo"` for the toolbar's.
- `.bo-wf__mode` is the Plotting / Wayfinding switch; the editing indicator is `.bo-wf__editing`.

### Testing

`tests/e2e/hallways.spec.ts` (pure, no server; the POC-parity block reads `PYN_CONNECT_POC_FIXTURES`, default the POC folder, and skips when absent — no real floor plan is committed). `tests/e2e/wayfinding.spec.ts` uses §13's session env plus `PYN_CONNECT_E2E_DETECT` (default 3837 Sylo: SVG floorplates, Floor 4 with stored hallways) and `PYN_CONNECT_E2E_NO_SVG` (default 1234 Alderwood: images only). Real ids: 3837 Sylo (everything), 1618 Hazel (31 floorplates, all with hallways, no SVG — skip path and timing), 2934 Dummy-High-Rise (SVGs + hallways), 1468 (SVG + image + 20 hallways).

## 24. Map & Plotting: stored hallways kept by Detect Hallways, bridges as editable graph elements, hollow markers — implementation knowledge (October 2, 2026)

Added with phase 2o (branch `improvement/wayfinding_hallway_persistence_markers`, from `feature/wayfinding_detect_hallways_auto_connect`; PYN_CONNECT_PROGRESS.md §28 has the root cause, the measurements and the test results; gaps M16 (updated) and M24 in `gaps_map_plotting_feature.md`). Brief: `POC_auto_plot_impmemnted_issues.md` (untracked).

### The flow now

```
Detect Hallways ▾ → useMapWayfinding.runDetect(scope) → for each floorplate, detectOne(level):
  has points (stored h: or page j:) → keep every one; autoConnectNodes(plateGraph) with the SVG's obstacles (cached, else fetched) → graphPatch adds `knn` page paths → row 'existing' ("Existing paths kept", N auto-connected)
  no points, no SVG            → 'noSvg'
  no points, SVG               → detectHallways (traced / inferred + the POC's auto-connect) → detectionPatch (additive) → 'detected'
Bridges: WfAnchor.attached (nearest point, or wfLinks by hand) → WfLayerLink (hit line + dashed line) → onLinkDown / onLinkDoubleClick / Erase / Delete → wfLinks[`${levelId}|${anchor}`] = null (detached)
Markers: WfAnchor.pin (polygon edge on the SVG via polygonEdge, the pin on the image) → WfLayerAnchor → `.bo-wf__anchor` (hollow ring / square)
```

### Rules worth knowing

- **Detection is additive.** `detectionPatch` diffs the floorplate's graph against itself plus the engine's result, so `hiddenNodes` / `hiddenEdges` / `nodeOverrides` are never written by a run; the "Detect & Replace" confirmation and `detectOne`'s `replace` flag are gone. A floorplate with stored hallways is therefore never re-read from its SVG (the two files share no frame, M20): to try the SVG there the user must hide the stored points first (Clear Paths, or deleting them), which Undo reverses.
- **Auto-Connect is part of the run** (the toolbar button, `autoConnect` action, `canAutoConnect` and the `autoConnect.*` / `toast.autoConnect*` strings are gone). On a kept floorplate it runs over the current points with `obstaclesForDetect` (the SVG's rooms / footprints when Wayfinding is on the SVG; none on the floor image) and records the added `knn` paths through `graphPatch`, so they are page paths between stored points. The run's Undo and Ctrl/Cmd+Z take them back; a second run adds nothing (`WfDetectRow.points` = points kept, `paths` = paths added; `generateDetectView` reads them as such — `keptTitle`, `keptDetail`).
- **A bridge is a graph element.** `wfLinks` values are `string | null`: a point chosen with Connect, or null = detached by hand (`WfAnchor.detached`, `attach()` returns no point). `wfSelLink` is the selected bridge (anchor key); `WfLayerLink.selected`; the panel's selection has `kind: 'link'` with Delete; `unlinkAnchor` goes through `edited()` (undoable, marks the level). `anchorsOnFloor` / `plateProgress` / routes all read `linked`, so counts, "Not linked" (meta "bridge removed on this page") and `computeWayfindingRoute` ("isn't connected to a path") follow. Clear Paths drops the level's `wfLinks` entries with its points.
- **Connect takes the polygon.** With the Connect tool a click on the plan goes through `anchorAt(px)`: on the SVG the smallest plotted polygon (`PlotTarget.bbox`) containing the point, on the image the nearest marker within 1.2% of the diagonal; then `anchorClicked` (the former body of `onAnchorDown`).
- **The Detect menu's panel bridges its own gap.** `.bo-map__apmenupanel` sits at `top: calc(100% + 6px)` with a transparent `::before` strip over the gap, so the wrapper's `onMouseLeave` fires only when the pointer leaves the panel (Auto Plot's menu shares the class).
- **A kept floorplate explains itself.** `generateDetectView(state, plates)` reads the live floorplates: a kept row names the stops that still join no path with `unlinkedReason` (shared with the Not linked list), the title becomes "Existing paths kept · N not linked" and the body says what to do. The common cause is an item plotted only on the floor SVG while Wayfinding runs on the floor image (M20).
- **Not linked rows link.** With a point in hand (`wfTool === 'connect' ? wfFrom : wfSel`, never with Erase / Move) each row carries a button; `linkListed` sets `wfLinks` and, for an item on the other layer, `wfPlaces[`${levelId}|${key}`]` (`WfPlace {x, y, space}`, in `WfSnapshot`, dropped by Clear Paths), which `placeAnchor` uses as the centre when the item has no door or pin on this layer (`WfAnchor.placedHere`). Plotting mode offers no floor-image layer for a floor with both files, so this is the only way to route to such an item here.
- **The marker offers its bridge too.** A unit snapped onto the corridor has a bridge too short to click, and a stop's disc covers its own, so `anchorClicked` with no tool and nothing in hand selects the marker's bridge (`hasBridge`), Erase on a marker removes it, and a double-click with no tool (`onAnchorDoubleClick`, on `.bo-wf__anchor` and `StopMarker`) removes it. The marker carries `data-polygon` (its `PlotTarget.key`) for tests.
- **Anchors carry two points.** `x`/`y` is where the bridge and the route meet the anchor: the door or pin on the image; on the SVG the polygon's edge facing the point it joins (`polygonEdge(bbox, centre, point)`), computed after `attach()` which still uses the polygon's centre as the CMS's nearest-point rule does. `pin` is where the marker is drawn (the same edge point on the SVG; the pin, else the door, on the image). Routes on an SVG floor therefore start and end at the polygon edge, not over the label.
- **Markers.** `WayfindingLayer` draws every unit / amenity anchor on both layers (`MapCanvas` draws no pins in Wayfinding any more; `WfLayer.pins` is gone): `.bo-wf__anchor` is a 10 px hollow outline with a dark 1.5 px border, a ring for units and a 2 px-radius square for amenities (`--amenity`), dashed red when the floor has paths and the anchor joins none (`--unlinked`), faded while the floor has no paths at all (`--idle`, so Clear Paths leaves no red dots), an amber halo when selected or picked for Connect; `::after` widens the hit area to 22 px. `data-linked` is `1` / `0`, absent when idle. Stop markers are unchanged (the design's discs).
- **Favicon.** `src/app/icon.png` (Next's file convention) is now the Pynwheel pinwheel (256 × 256, from the repo-root `public/logo_transparent_bg.png` the user supplied; that source file stays untracked). **Profile:** `CurrentUserProvider` (`core/session/CurrentUserProvider.tsx`, a client context the `(connect)` layout fills from `loadCurrentUser`) feeds `Navbar`'s `.bo-topbar__user` (avatar, name, role) between the bell and sign out; `Sidebar` takes no props and shows no user. Under 760 px the name and role hide with the environment chip.

### Testing

`tests/e2e/hallways.spec.ts` (+3: additive `detectionPatch`, Auto-Connect over a stored graph adds `knn` page paths only, `polygonEdge`), `wayfindingLogic.spec.ts` (+1: a detached bridge in counts, Not linked, the route error, and re-linking), `wayfinding.spec.ts` (the toolbar has no Auto-Connect button; Detect on a floorplate with paths is 'existing' and keeps every stored `[data-node="h:…"]`; the All-floorplates run keeps stored points and may add paths). The verify pair (CMS :3100 on `pynwheel_development`, Connect :3005 from an rsync'd copy, `.claude/launch.json`) plus a scratchpad script drive John Demo 1411 (4 image floorplates with 25 / 12 / 23 / 14 stored hallways, 226 plotted units, one elevator), Sylo 3837 (stored Floor 4 with an SVG; SVG-only floors) and Alderwood 1234 end to end, with a non-GET audit. The local `pynwheel_prod` copy the user's own puma uses cannot be read from this tool (permission), so 1411 there — the "Tower A · Floor 3" the brief names — was not driven here.

## 25. Critical issues, phase 1 — implementation knowledge (October 3, 2026)

Added with phase 2p (branch `fix/critical_issues_phase1`; PYN_CONNECT_PROGRESS.md §29 has the issue → root cause → change table and the measurements). Brief: `critical_iisues_phase1.md` (untracked).

### Rules worth knowing

- **One product definition.** `Connect::ProductState` (`app/serializers/connect/product_state.rb`) decides Touch / Self-Guided Tour / Maps for every Connect JSON: the Settings-page columns (`touchscreen_app`, `self_tour`, `enable_sdk_map`) *or* the Pynwheel Launch order form (`product_options`, a jsonb holding a JSON string). The listing row, Property Detail, `amenities.json` `meta.self_tour` and the wayfinding `settings.self_tour` all read it; `AccessibleCommunitiesQuery::PRODUCT_CONDITIONS` says the same in SQL. In the development dump: touch 544, tour 227, maps 76 (one property is on by the order form only; `enable_sdk_map` is false on every row, so Maps lives in `product_options`). Never decide a product state anywhere else.
- **Wayfinding is a tour capability.** `wayfindingEnabled(map) = settings.selfTour`. `auto_wayfinding` is a setting within the tour (the legacy "Automate Wayfinding" switch): it still drives the door-plus markers, not whether the mode, Additional Stops or vertical links are offered.
- **Hover shows what a click shows.** Polygon popover (`generateHoveredPolygon` → `polygonPopover`), stop popover and marker name appear on hover and go when the pointer leaves; a click pins the same popover (`selPoly` / `selStop`). `usePeek` keeps a hovered popover alive while the pointer travels into it (180 ms grace, `onEnter` / `onLeave` on the popover), so its buttons can be used; `data-peek="1"` marks a hovered one. Nothing prints on the plan permanently: `MapCanvas.labelled` is only hovered-or-selected polygons whose SVG prints no text. `SvgPlanLayer` compares the pointer's polygon with `hoveredKey` (the page's `state.polyHover`), not a local ref — a hover the page reset is reported again — and falls back to `document.elementsFromPoint` when the pointer is over something on the shape (its room number), the legacy point-in-shape rule.
- **Nothing is drawn while a plan loads.** `MapCanvas.ready` gates every overlay (pins, nodes, paths, stops, labels, popovers, the Wayfinding layer) on the SVG being mounted or the image having finished (loaded *or failed*; a failed image still shows the stored markers over the "could not be loaded" plan). Tests that count markers must wait for `.bo-map__surface .bo-loading--cover` to leave.
- **Hover-close menus go through `HoverMenu`** (`molecules/HoverMenu.tsx`): wrapper `.bo-hovermenu` with `onMouseLeave`, panel `.bo-hovermenu__panel--left|right|stretch` at `calc(100% + var(--bo-menu-gap))` with a transparent `::before` bridge; outside click and Escape close. The panel's own class (`.bo-map__apmenupanel`, `.bo-map__showmenu`) only styles it. Any new floating menu that should stay open on hover uses it; the audit (Oct 3) found no other hover-close menu in `src`.
- **The map toolbar is `| switch | text | actions |`.** `.bo-map__toolbar` does not wrap; `.bo-map__toolbartext` is the only part that shrinks and wraps (centred on the switch); `.bo-map__toolbaractions` is `flex: 0 0 auto` with `margin-left: auto`. Below 760 px the action group drops to its own row as a unit. The Building row renders only for `buildings.length > 1` (`mapBuildings` counts floorplate buildings plus the ones units and amenities name, so Trestle shows 9 pills).
- **Units are read one page at a time.** `units.json` with a `page` → `Connect::UnitListingQuery` (`app/queries/connect/unit_listing_query.rb`): `UnitFilterQuery.new(community, q/min_price/max_price/min_sqft/max_sqft/sort/dir).results.includes(:door)` then the tab's multi-select filters (`floorplan` by `floorplans.id` or `none` = no plan resolves, `availability` now/soon/notAvailable/sold with sold first and `today` as the caller's day, `building`, `floor`, `state` plotted/unplotted/model (`units.modal_unit`)/manual/noPhotos, `beds`, `baths`), paged by `Connect::PaginatedCollection` (default 25, cap 100); `meta.pagination`, `meta.filters` (buildings, floors, bedrooms, bathrooms, `missing`), `meta.total_count` = the filtered count. Without a `page` the listing is the whole set, as Map & Plotting, Tour Setup and Unit Detail need. In Connect: `useInventoryUnits` → `unitListingQuery(filters, page, perPage, today)` → `/api/properties/:id/inventory/units?…` (the route handler whitelists the parameters) → `loadInventoryUnitsPage` → `fetchInventoryUnitsPage`; `InventoryUnitListing.pagination / options / totalCount`. The Inventory route passes `units: false` always; `PropertyInventory.unitBuildings`, `unitOverrideCount`, `dataProvider`, `lastSync`, `lockDevices` come from `floorplates.json` meta, so no dialog waits for units (`dialogNeedsUnits` is gone) and the unit form is given its row (`InventoryDialog { kind: 'unit', unit }`). `next dev` runs effects twice (Strict Mode), so a mount's first page request is aborted and re-issued; tests count only non-aborted requests.
- **Rows per page.** `PAGE_SIZE_OPTIONS = [25, 50, 75, 100]`, `DEFAULT_PAGE_SIZE = 25`, `clampPageSize` (`pagination.generator.ts`). `Pagination` shows the select whenever it is given `onPageSizeChange` and more than one size applies; Companies and Properties send `per_page` to Rails (the default is left off the URL), `useClientPages(items)` pages the Floorplans and Amenities tabs at 25 with `setPageSize`, the Units tab sends the size with its request. A size change starts from page 1.
- **Companies filters** are `status` (active / inactive), `pms_provider` (slugs; `none`), `properties` (with / without), comma lists, OR within and AND across (`AccessibleCompaniesQuery`), with `meta.filters.pms_providers` for the options; the frontend copies the Properties pattern (`CompanyFilters`, `useCompaniesListing` selection, `MultiFilter`). The Properties count cell is a `number` cell with `href` = `/properties?company_id=N` (`companyPropertiesHref`).
- **The stop-list pill belongs to the tour.** `generateAmenityCards(amenities, selfTour)` adds "In Stops List" / "Hidden from Stops" only when the property has the Self-Guided Tour; the State filter offers those states only then. The amenity dialog keeps its "Show in Stops List" switch with the existing hint.
- **Unit cards view, never upload.** The thumb's only action is View images; a unit with no image at all shows `MediaThumb`'s static placeholder (no `onClick`). Floorplan image behaviour is unchanged.
- **The image viewer zooms like the map.** `ImageViewer` holds a `View { scale, x, y }` (1–8×, ×1.3 per button, wheel about the pointer, drag to pan when zoomed, Reset to the fitted image); `data-scale` on `[data-testid="viewer-stage"]`. The `LoadingIndicator` stays a direct child of `.bo-viewer__stage` (the Hazel spec measures it there).

### Real ids for this phase

1411 John Demo (4 image floorplates, one building "A", 230 units, Self-Guided Tour and auto wayfinding on), 1105 Trestle (9 buildings in the Building row), 1232 Lincoln at Dilworth (tour on, auto wayfinding off), 557 The Ogden (tour off, 250 amenities, 15 floorplates), 1106 The Carson (tour on — its `self_tour` column is true despite the order form saying otherwise), 1618 Hazel (loading-state checks: floor images on S3), 3837 Sylo (SVG floors; Floor 0 for hover popovers), 1468 (the 2.6 MB real floor SVG, 7–90 s through the proxy from this machine).

### Verifying (traps met on Oct 3)

- Run Playwright with the project's binary (`./node_modules/.bin/playwright test …`); `npx playwright` resolved another installation and failed with "test.describe() … two different versions".
- A locator for an element that is no longer rendered (`.bo-map__polylabels` when nothing is hovered) makes `innerText()` wait for the whole test timeout; read with `allInnerTexts()`.
- Synthetic `dispatchEvent('pointermove')` hovers never generate a leave: steps that then expect the popover to close must move the real pointer (`locator.hover()` then `page.mouse.move` off the plan).

## 26. Listing search race, searchable filters, Property Detail audit — implementation knowledge (October 3, 2026)

Added with phase 2q (same branch as §25; PYN_CONNECT_PROGRESS.md §30 has the root cause and the measurements).

### Rules worth knowing

- **Listings fetch from the browser now.** `useServerListing` (`core/hooks/useServerListing.ts`) is the one place a server-paged listing's search, filters, sort, page and size live: one state, one request per change to this app's route handler (`/api/listings/companies`, `/api/listings/properties` → `listings.server.ts` → the existing CMS JSON), 300 ms debounce on typing (`SEARCH_TYPING_DELAY`), `AbortController` on every new request, a sequence number checked before and after the body is read (the latest request is the only one whose answer counts), the search box as local state a response never writes, `history.pushState` for the URL and a reload from the URL when it moves without the hook (Back / Forward). The page's server render is only the first paint. Do not go back to `router.push` for a listing change: it cannot be cancelled and it re-renders the screen from the URL, which is the race.
- **`listingParams.ts` is the one reader and writer of listing state** (`companiesParamsOf` / `propertiesParamsOf` from any `(key) => value`, `…FromSearch` over `URLSearchParams`, `companiesSearch` / `propertiesSearch` to the canonical query string with defaults left out and a fixed order). The pages, the route handlers and the hook all use it; two equal states give one string, which is how the hook tells its own URL from another.
- **`MultiFilter` is searchable from six options** (`SEARCHABLE_FROM`; `searchable` overrides). Short state lists stay plain. The panel's search box is `role=searchbox` named "Search {label}…" (label lower-cased); tests scope to `getByRole('group', { name })`, since the toolbar's own search input is a searchbox too and the top bar's global search shares the word "companies" in its placeholder.
- **Property Detail is the record, full stop.** Everything on `/properties/:id` (numeric) comes from `communities/:id/edit.json`; empty states are "—", "Not set", "Unassigned", "No notes yet."; the lifecycle is the serializer's five milestone-dated stages and must not be changed; the Self-Guided Tour card's links exist only while the tour is on. `scratchpad/verify-detail.mjs` (pattern: compare every rendered field with `edit.json` for a list of ids) is how to re-check it; the label texts it needs are the `propertyDetail.*` i18n strings.

### Real ids for this phase

1469 City's End (no products; no phone, website or manager), 1062 The Line (no address), 1778 Paperbox Lofts (a named property manager), 2048 Cityway Test, 1107 (no city), plus §25's 1411 / 557 / 1232 / 1618 / 2919. Companies search: "haz" matches no company, "ha" a few — a ready-made race fixture; Properties: "the" has several pages.

## 27. Map & Plotting / Tour Setup persistence and the Tour App API — implementation knowledge (October 4, 2026)

Added with phase 3a (PYN_CONNECT_PROGRESS.md §31; the full account is `map_plotting_backend_implementation.md`).

### Rules worth knowing

- **Adjacency stays in `hallways.next_points`; everything else about an edge is a `hallway_edges` row** (canonical `from < to`, polyline interior points in the stored frame, kind, review, run). A confirmed row is mirrored into the lower id's `next_points`; a pending one never is. The legacy editor dropping an adjacency deletes the row (`Hallway#prune_edge_rows_for_removed_links`); never the other way round.
- **`Hallway.routable` = confirmed ∧ floor-image frame.** The legacy pages, `ShortestPath` and `make_sure_one_selected_hallway` see only those; a pending or svg-space node exists for Connect alone. Every pre-existing row is routable (the defaults), which is why the snapshot harness shows no change.
- **Coordinates are stored in the legacy frame:** icon top-left for hallways, elevators, entry points, doors and the tour start (the page subtracts `NODE_ANCHOR_OFFSET` = 8), the point itself for `wayfinding_stops`; a Tour App node says which (`anchor`). Never convert on the server.
- **Detect never overwrites:** `origin: 'detect'` may only add; a proposal within 6 px (raster) / 0.4 % of the SVG diagonal of a stored node merges onto it; one within tolerance of a `hallway_suppressions` tombstone is skipped; a hand-made point at a tombstone deletes the tombstone. A run is one `request_id`; replaying it returns the stored answer.
- **Versions are compare-and-swap:** `floorplates / sitemaps.wayfinding_version`, `tours.tour_setup_version`; a save sends `base_version`, the CMS answers 409 `stale_version` with the current graph. `Wayfinding::VersionBump` callbacks move them on legacy writes too; `suspend` wraps the transactional saves. `Wayfinding::GraphVersion` (the Tour App ETag) hashes the counters and every table's count + latest `updated_at`, plus `PAYLOAD_FORMAT` — bump that whenever the Tour App payload changes shape.
- **"Show in Stops List" is one fact, read and written the same way:** a visible `tour_stops` row of the main tour (units), and for amenities that row plus the form's `breezway_lock_visible` (`TourStops::Membership`). The Inventory pill, the State filter, the dialog switch and the serializer's `in_stops_list` all read it; the legacy flag alone is `show_in_stops`. Bowers Residences (2157) has 7 amenities outside the list (one flag off, six never added as stops).
- **Plotting is not saved from the UI yet** (October 5, 2026): `PLOTTING_SAVE = false` in `graphDiff.ts` keeps unit / amenity pins out of the payload and out of `clearSavedLevel`, and the Save button renders in Wayfinding mode only, because a saved pin could not be removed from the plan. Flip the constant when unplotting a saved pin works end to end; `Wayfinding::PinWriter` is ready.
- **PaperTrail rows go on the real record** (`Floorplate` / `Sitemap` + `wayfinding_save|wayfinding_detect|wayfinding_reproject|wayfinding_detect_undo`, `Tour` + `tour_setup_save`, `Unit` / `Amenity` + `stop_list_add|stop_list_remove`); an invented `item_type` makes PaperTrail constantize it.
- **The Tour App gate is the Self-Guided Tour** (`Connect::ProductState.tour?`), the routes need `.json` (the api namespace constrains the format), and the token check is the legacy one (`TokenAuthorization`); locally `SECRET_KEY_BASE` is unset, so run the verify server with `API_ACCESS=true`.
- **`test/` was in `.gitignore`** (line 26) until October 5, 2026, when the owner had the rule dropped; a checkout that still hides new test files has an old `.gitignore`. Run them with `RAILS_ENV=test DATABASE_URL=postgres://<user>@localhost/pynwheel_test bundle exec rails test` and the toolchain prefix of §25; `test_helper.rb` filters the `test_*_url/_path` route helpers out of Minitest's runnable methods; integration tests need `host! 'pynwheel-staging.herokuapp.com'` (the session cookie's domain outside development).

### Real ids for this phase

1411 John Pynwheel Demo / floorplate 1867 (74 hallways; Elevator 1 = `elevator:520` on four levels; units 397207 "229" on floor 2 and 397248 "315" on floor 3 route through it; the plate also has a disconnected 5-node piece, so a route to a unit on it is an honest `no_path`); 557 The Ogden (no tour → 422 on every write and on the Tour App API); 2157 Bowers Residences (the amenity pill); 1105 Trestle (two buildings), 2934 Dummy-High-Rise (SVG mode), 1839 Oeuvre (stacked 1–6), 2919 Sofia, 1618 Hazel (31 floorplates), 1412 Jennifer Demo FP; the snapshot harness default set 1411, 2934, 1468, 1839, 2919, 1105, 1234, 1786, 2935.

### Verifying (traps met on Oct 4)

- The verify Rails server's `Rails.cache` is a memory store in development: a serializer change is invisible until the version string moves or the server restarts (`PAYLOAD_FORMAT` exists for that).
- Legacy `:null_session` actions answer 401 to a script without `X-CSRF-Token`; send the page's meta token.
- Playwright real-data specs encode the data as it was when they were written: a semantic change (the pill's meaning) or a new control (the Save button) fails them honestly; update the expectation with the real count, not the code.

## 28. Tour App backend: the FastAPI Tour App API (October 5, 2026)

The Pynwheel Tour mobile app (`tour-app/`, §27 / `tour-app-implementation.md`) now runs on real data
through a new service, **`tour-api/`** (FastAPI, Python; write-up `tour-app-backend-api.md`;
branch `feature/tour_app_backend_api`).

- **No Rails change.** The session's security classifier refused adding any new credential path to
  Rails (a Doorkeeper bearer on the Oct 4 wayfinding controller, or a new `api/v2` controller), so
  the service reads the CMS database **read-only** (`default_transaction_read_only=on`) and carries a
  line-for-line Python port of `Wayfinding::GraphBuilder` / `RouteService` / `Timing` /
  `GraphSerializer` / `GraphVersion`. `tour-api/scripts/parity.py` proves it identical to the Rails
  Tour App API (`api/self_tour/v1/.../wayfinding*`) on 13 real properties: every graph element and
  every route. `rails test`: 103 runs / 338 assertions / 0 failures, unchanged.
- **Sign-in** reuses the CMS's Doorkeeper password grant as-is — note the path is
  `POST /api/v2/auth/token` (`use_doorkeeper scope: 'api/v2/auth'`), not `/oauth/token`; a wrong
  password answers HTTP 400 with `{success:false, status_code:401}`, and a correct password for a
  non-portal user (`User#verified_portal_user?` false) answers HTTP 200 **without** a token (the token
  row is still created). Tokens are validated from `oauth_access_tokens`; only `role = 'Super admin'`
  is admitted; sign-out revokes at `POST /api/v2/auth/revoke`.
- **Facts mirrored from Rails** (never redefined): `Connect::ProductState.tour?` (incl. the
  double-parsed `product_options` JSON string), `TourStops::Membership.in_list?` (main tour =
  `tours.tour_user_id IS NULL` latest; amenities also need `breezway_lock_visible`), the tour order
  (building order → floor → `tour_stops.sort` → id), upload URLs (`standard_image_url` →
  `s3-accelerate` host; floor SVG under `uploads/<model>/svg_image/<id>/` on the property's bucket).
- **Endpoints** (`/api/v1`): auth login/logout/me; properties (list, detail); per property: stops,
  map, map/levels/{id}, graph (ETag/304), route, tour-route (chosen stops → ordered segments),
  stops/distances. Errors: `{success:false, error:{code,message,details?}}`.
- **Mobile**: `PynwheelApiTourRepository` is the configured provider (`VITE_TOUR_API_URL`); the dummy
  provider only with `VITE_TOUR_DATA_SOURCE=dummy`; no fallback. New screens/flows: real sign-in,
  property picker on Search, "Change property" on Home, session expiry → sign-in.
- Verification accounts in `pynwheel_development` only: `tour-api-verify@pynwheel.local` (Super
  admin, id 2050), `tour-api-viewer@pynwheel.local` (Community manager, id 2051).
- Known gaps: no `scale_ft_per_px` anywhere (pixels, no minutes); 1411's dev floor images 403;
  `wayfinding_stops` are not tour stops (phase 2); concierge/booking/application/locks have no
  backend; Preferences is not encrypted storage.

## 29. Tour App map rendering fix: SVG plans, zoom, playback (October 6, 2026)

Brief `map_rendering_issue_in_tour_app.md`; details in `tour-app-backend-api.md` §13 and
`tour-app-implementation.md` §14.

- **Root cause of the blank map**: the app drew only a raster `<image>` (or a grey rectangle) and
  never the floor SVG; a failed image rendered nothing with no error state; an SVG-only plate had a
  0×0 frame. Fixed with one coordinate rule (`tour-app/src/map/mapBase.ts`): frame = floor image
  pixels, else the SVG viewBox (SVG-only plates are plotted in viewBox units — 3029's hallways lie
  in its 2000×2000 box), else the measured image; the SVG fills the frame as the CMS canvas does
  (`preserveAspectRatio="none"`) unless `svg_to_image_transform` is stored (null everywhere today).
- **SVG delivery**: S3 serves the files without CORS (Connect proxies them too), so the API now
  serves `GET /api/v1/properties/{id}/map/levels/{level_id}/svg` (validated, cached, ETag/304,
  `X-Svg-ViewBox`); the app loads it into a Blob URL drawn by an `<image>` (no inline DOM of a 5 MB
  file). `/map` levels carry `svg_path`, `svg_transform`, `svg_size`. `/graph` unchanged.
- **Zoom**: the map container captured the pointer on every `pointerdown`, so the `+` button's click
  never fired (the second tap registered as a double-tap zoom). Controls are now `+` / `−` / Reset,
  one action per tap.
- **Playback**: speed = 45 px/s in the design frame × the level's diagonal unit, clamped 30–140 px/s
  (`PLAYBACK_SPEED_DESIGN_PX_PER_S`); transition hold 2.2 s.
- **HTML in instructions**: `directional_text` is rich text; the API strips tags (`strip_html`).
- Verified on 2934 (SVG-only `floorplate:3029` 5.2 MB, raster+SVG 3085), Hazel (raster) and 1411
  (private bucket → explicit "Map unavailable"). Not verified on iOS/Android web views (no SDKs
  here). Verification account `tour-api-verify@pynwheel.local` had its password changed by the
  owner on Oct 6 and was reset again for this run.

## 30. Tour App API ported into Rails; tour-api retired (October 7, 2026)

Branch `feature/tour_app_rails_api`; full account in `tour-app-backend-api.md` §14,
`tour-app-implementation.md` §15, `PYN_CONNECT_PROGRESS.md` §34.

- **One runtime.** The FastAPI service of §28–29 is gone (`tour-api/` deleted, its launch entry and
  Python harness removed). The Tour App API is `Api::TourApp::V1` in the CMS: `/api/tour/v1/{health,
  auth/login, auth/logout, auth/me, properties, properties/:id, …/stops, …/map, …/map/levels/:id,
  …/map/levels/:id/svg, …/graph, …/route, …/tour-route, …/stops/distances}` + a JSON 404 for the prefix.
  Controllers in `app/controllers/api/tour_app/v1/`, the contract layer in `app/services/tour_api/`
  (`Auth`, `Properties`, `Engine`, `Shapes`, `Stops`, `Maps`, `Assets`, `RouteService`, `Routing`,
  `Text`, `ApiError`). The `Wayfinding::*` services, `TourStops::Membership`'s rule,
  `Connect::ProductState`, `Connect::UploadUrl` and `Wayfinding::PlateTransform` are reused as they are.
- **Why `/api/tour/v1` and not `/api/v1`.** `GET /api/v1/properties` is a legacy vendor route
  (`api/v1/schedule_tours#communities`); the `constraints: { format: 'json' }` on the legacy `api`
  namespace is a default, not a requirement, so suffix-less requests reach it too (the §27 note "the
  routes need `.json`" is wrong for that namespace). The app's prefix is one constant.
- **Authorization (the part the Oct 5 classifier refused).** Only the new controllers accept a CMS
  Doorkeeper bearer token: `Doorkeeper::AccessToken.by_token` → revoked / expired → user → inactive
  (pending invitation, inactivated company) → `is_super_admin?`; property access
  `User#can_access_community?`. Sign-in runs the Doorkeeper password grant in-process
  (`Doorkeeper::Helpers::Controller#server.token_request('password').authorize`), so Devise checks the
  password; refused accounts (`not_authorized_account` for non-portal users, `not_super_admin`,
  `inactive_user`) have the minted token revoked at once. `Api::SelfTour::V1::TokenAuthorization` is
  untouched. The owner authorised this namespace explicitly.
- **Contract.** Byte-identical with the FastAPI service on 1411 / 1618 / 2934
  (`script/tour_api_parity.rb`: 57 comparisons, 0 differences on the literal port), because the Pydantic
  models serialised every field and `TourApi::Shapes` mirrors that (nulls present). One deliberate fix
  in its own commit: `tour-route` segment leg/step indexes are per segment and `transition.to_level_id`
  is filled after the first stop (FastAPI offset them twice).
- **Caching.** Built graphs per (property, `Wayfinding::GraphVersion`, step_free, avoid_blockers) in a
  per-process store (15 min, 64 entries; AR rows and default-proc hashes cannot go in `Rails.cache`);
  the `GraphSerializer` payload and the `/graph` JSON string ride with the built graph; the property
  list 60 s per process; SVGs 128 MB per-process LRU. The graph version is recomputed per request, so
  CMS edits are seen at once. Rails' own `graph_version` digest differs from the Python mirror's
  (number formatting) — normalise it when diffing old captures.
- **Logging.** `token` added to `config.filter_parameters`: it also masks the `oauth_access_tokens.token`
  bind in ActiveRecord's debug SQL log, which otherwise prints the bearer token on every request in
  development and staging (and always did for the legacy token endpoint's INSERT).
- **Tests.** `rails test` 167 runs / 831 assertions / 0 failures (103 / 338 before + 64 new). Traps: the
  test env's uploaders are fog without a bucket (`Connect::UploadUrl` raises for any level with an
  image / svg_image → stub, `with_s3_uploads`); a fixture `Community` caches `floorplates` before
  `setup` creates rows (`pluck` on a loaded association is in-memory) → re-find it before computing
  the graph version.
- **Verification recipe.** The dev verify server (:3100) autoloads the new controllers and routes
  without a restart (initializers need one); `tour-app` launches with
  `VITE_TOUR_API_URL=http://127.0.0.1:3100`; the verification Super Admin's password is reset per
  session with `rails runner` and kept out of the repo; `script/tour_api_measure.rb` for timings.
  Development-mode floor ≈ 25 ms per request; FastAPI was 5–15 ms; production not measured.

## 31. Tour App final QA pass (October 7, 2026)

`issues_in_tour_app.md` → `tour-app-final-qa-report.md`. Knowledge worth keeping:

- **Production reads were refused** by the session's classifier (`pynwheel_prod`, "Production
  Reads"), and its ruling covers reaching the same data through any tool, so the John Demo
  production investigation needs the owner (permission rule, or run the scripts themselves).
  Everything was measured on the development dump instead; the generic fixes carry over.
- **Play Route was slow for architectural reasons, not data**: per-frame dispatch into the global
  store (the whole app re-rendering 60×/s) and the plan sharing one SVG with animated layers (every
  tick repainted a multi-megapixel image). Fixed in `useSimulationPlayer` (live state local,
  store published ≤ 2×/s) and `MapView` (plan on its own compositing layer). Measured: 60 fps,
  worst frame 18.7 ms on 2942×1942 plans.
- **A floor change costs one network fetch + decode** of the next plan unless it is prefetched:
  `usePrefetchRouteLevels` warms the route's stage levels when the route arrives (217 ms hitch → none).
- **The app loaded every property bundle twice** (`getPlaces` and `getContent` inside the same
  `Promise.all` as `getProperty`, no cached bundle yet) and refetched the 145 KB property list on
  each switch. In-flight promises are now shared per property / list / session restore.
- **Cold graph builds were one per concurrent request** (`TourApi::Engine`); now single-flight.
  Count builds with `grep -c "Hallway Load" log/development.log` around a request.
- **Floor SVGs are now disk-cached** (`tmp/cache/tour_api_svg/`); the first S3 read is the only
  slow stage anywhere (9–205 s observed for 5.2 MB on this connection).
- **Search had no Cancel**; `<input type="search">`'s native clear bypasses React on some web views —
  use a text input with your own controls.
- **Unroutable stops in the dump** (Jennifer Demo FP ×4, The Lagoons ×2, The Meadows ×1) all sit on
  plates with zero hallway points (`link: none`): a data gap for the CMS, correctly reported by the
  app ("no path yet", skipped with a warning). Hazel Copy Test (1935) has no plotted tour start →
  `no_start`, shown as "Route not available" with Generate still active.
- Dev-only noise: Vite HMR replaces the repository singleton (a concurrent `ensureSession` race
  showed "Choose a property first." once — now one shared restore); React StrictMode runs the
  restore effect twice (`auth/me` ×2).
- **Production run (same evening):** John Demo on `pynwheel_prod` is 6 SVG plates (555 KB each);
  API 23–66 ms warm, Play Route 60 fps on its plates. A 1 fps reading seen first was the Claude
  browser pane being hidden (rAF throttled to 1 Hz) — always check `tabs_context` before trusting
  frame numbers. Stale selection across properties and the 4,832-row picker were the real app
  findings there (both fixed). Launch entry `rails-cms-prod` runs the verify server on the
  production copy; a token can be minted with `rails runner` for `TOUR_API_TOKEN` and must be revoked.
