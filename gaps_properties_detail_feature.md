# Property Detail: backend and data-access gaps

**Date:** September 24, 2026
**Branch:** `feature/properties_detail_page`
**Target design:** `pyn-connect-22-sep-new.html`, screen `isPropertyDetail`
**Related:** [PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md) §15–§16 · [context.md](context.md) §11–§12 · the revised rule: §0 below

This file lists what the Property Detail page could and could not read from the **existing** Rails backend. The brief ruled out backend changes: no migrations, columns, APIs, serializers, controller, model or route changes. Everything under "Unavailable" is therefore left out of the page. Nothing is shown with a placeholder value.

Only backend and data-access gaps are listed here. Frontend work that the existing data would already support is not.

---

## 0. Update, September 24, 2026: the revised backend rule

The brief's rule changed (`properties_detail_feature.md` §9a). A **minimal, read-only JSON branch on an existing controller action** is now allowed when it only exposes existing data. Business logic, authorization, queries, models, the schema and write behaviour must not change.

**What was done:**
- `CommunitiesController#edit`, the legacy Property Details action, gained `return render_connect_property_detail if request.format.json?`. This is the same guard `#index` uses. The HTML path is unchanged.
- The JSON is `Connect::PropertyDetailSerializer`. It holds the listing row (reusing `Connect::PropertySerializer`), plus the record's existing columns and counts of its existing associations.
- It serves only communities in the Connect listing's scope (`AccessibleCommunitiesQuery`); anything else is a 404.

Sections 2 and 3 below are the original no-backend-change analysis, kept for history. This table records where each gap stands now:

| Gap | Now | How |
|---|---|---|
| G1 one-property lookup | ✅ Resolved | One request, `GET /communities/:id/edit.json` (~0.1–0.35 s) |
| G2 Location (street, ZIP, coordinates, auto/manual) | ✅ Resolved | `address`, `zip`, `latitude`, `longitude`, `manual_lat_long` |
| G3 Leasing Contact | ✅ Resolved | `phone`, `email`, `website` |
| G4 On-Site Team | ✅ Resolved | `property_manager_*` |
| G5 Map mode, Notes | ✅ Resolved | `is_sitemap`, `description`. "Number of Units" shows `units.count`, as the legacy form does |
| G6 Edit Details (save) | ⛔ Disabled on purpose | The form is built and prefilled; Save sends nothing (the rule keeps Connect read-only) |
| G7 Product metrics | ✅ Mostly | Units · floorplates for Touch; tour stops for Tour (`Community#community_tour`). Maps pins/paths: still a gap (R4). Toggling: disabled on purpose |
| G8 Inventory counts, sub-communities | ✅ Resolved | `units`, `floorplans`, `floorplates`, `amenities` counts; `Community#fetch_multi_properties` + units grouped by `property_id` |
| G9 Property Settings | ✅ Resolved (read-only) | The 16 `communities` flags from the Floorplates and Settings pages |
| G10 Billing Rate Card | ✅ Resolved (read-only) | `billing_rate_touch`, the self-tour rate the Settings page shows (Lincoln/Dwelo rule), `billing_rate_maps`, `billing_rate_for_both`, `billing_type`, `billing_month`. Blank rates show "Not set", never the legacy form's pre-filled defaults |
| G11 Lifecycle | ✅ Partly | Each stage shows its recorded milestone date. The 7-stage model is still a gap (R1) |
| G12 Touch / Tour / Maps cards | ✅ Mostly | `code`, `is_vertical_app`, `date_installed`, `mdu`, `show_gesture_icons`, `powered_by_btn`; `visual_id_verification`, `enable_locks`, `auto_wayfinding`; `web_map_type`, `default_satellite_view`, `default_map_floor` (+ `Community#property_floor_options`), `enable_three_d_maps`, `is_beans_svg`, `enable_svg_mode`, `enable_sdk_map`, `enable_floorplan_level_color`, `highlight_all_units_on_hover`. QR codes and a tour start date: still gaps (R2, R3) |
| G13 ILS Syndication | ✅ Resolved (read-only) | `Community::MAP_PARTNERS` + `partner_map_enabled?` (`partner_map_settings`) |
| G14 Manage This Property destinations | ⏳ Partly | Map & Plotting is real for numeric ids since Sep 25 (phase 2g, `gaps_map_plotting_feature.md`); Integrations and Branding are still demo screens. Inventory is being made real on `feature/inventory_implementation` |

### Remaining gaps (a minimal JSON response cannot close them)

**R1. The 7-stage launch lifecycle**

| | |
|---|---|
| **UI requirement** | Order Received → Payment Received → Pre-Production → In Production → Released → Installed → Orientation |
| **Rails source investigated** | `api/v2/communities#move_to_production`, `Statuses`; the milestone columns |
| **Model / data** | `communities.date_activated`, `production_started_date`, `submitted_final_approval_date`, `released_date` (four dates, five stages) |
| **Why it cannot be exposed** | Nothing records order, payment, pre-production, installation or orientation |
| **Why a JSON response is not enough** | There is no data to serialize; inventing the stages would be new business logic |
| **Future work** | A lifecycle model or columns, and the process that sets them |

**R2. Entry QR codes (Self-Guided Tour card)**

| | |
|---|---|
| **UI requirement** | "Entry QR Codes · two active codes · lobby and gate", with a QR dialog |
| **Rails source investigated** | Models, controllers, `db/schema.rb`, the Gemfile, and every column name containing "qr" |
| **Model / data** | None: no table, column or QR library |
| **Why it cannot be exposed** | The data does not exist |
| **Why a JSON response is not enough** | Nothing to serialize |
| **Future work** | A QR-code model (or a generator over an existing tour URL, if the business defines one) |

**R3. A separate Self-Guided Tour subscription start date**

| | |
|---|---|
| **UI requirement** | "Subscription Start Date" on the Tour card, separate from Touch's |
| **Rails source investigated** | `settings_page.html.haml` (one "Subscription Start Date" field, `date_installed`) |
| **Model / data** | Only `communities.date_installed`, shown on the Touch card |
| **Why it cannot be exposed** | There is no per-product start date |
| **Why a JSON response is not enough** | Reusing `date_installed` for Tour would present one date as two facts |
| **Future work** | A per-product subscription date, if billing needs it |

**R4. Pynwheel Maps "N pins · M paths"**

| | |
|---|---|
| **UI requirement** | The Maps product line's pin and path counts |
| **Rails source investigated** | Tour stops, amenities, hallways/pathways (`HallwaysController`, `automate_plotting`) |
| **Model / data** | Plotted markers and hallway points exist, but the design's "pin" and "path" are not defined anywhere in the CMS |
| **Why it cannot be exposed** | No existing method counts pins or paths |
| **Why a JSON response is not enough** | Choosing which records count as a pin or a path would be new business logic |
| **Future work** | The business defines the two counts; an existing model method then serves them |

**R5. Writes (by rule, not missing data)**

Edit Details, Edit Rates and every toggle are **UI only**. The forms prefill from the record; Save sends no request and shows a notice that nothing was saved. Enabling writes needs the phase 3 decision and a CSRF strategy for the proxy (G6).

**Presentation notes (the data is shown as stored):**
- **Map Display Type:** the design's four options (2D + 3D / 2D / 3D / Satellite) do not map one-to-one onto `web_map_type` (`2d-map` / `3d-map`) plus `default_satellite_view`, so both are shown as stored.
- **Billing cadence:** the design says "Monthly"; every row stores `billing_type = annual`.

---

## 1. How Connect reads a property today

Only one JSON endpoint returns property data under the Devise session that Connect's proxy holds:

```
GET /communities.json
  CommunitiesController#index → render_connect_properties
  → AccessibleCommunitiesQuery (the user's scope) → Connect::PropertySerializer
```

Each row carries:
- `id`, `name`, `city`, `state`, `location`, `unit_count`
- `company_id`, `company_name`, `region_name`
- `stage`, `products {touch, tour, maps}`, `integrations {lock, identity, pms}`
- `tour_published`, `data_provider`, `data_provider_updated_on`, `time_zone`, `move_to_production`, `updated_at`

It accepts `page`, `per_page` (at most 100), `q` and four filters. **It has no id filter, and no single-property JSON endpoint exists.**

Other sources were checked and ruled out:

| Candidate | Why it cannot be used |
|---|---|
| `CommunitiesController#edit` / `#settings_page`, `FloorplatesController#index` (legacy HTML) | HTML only; a `.json` request has no template. Scraping the HTML would be brittle and has side effects: `current_company` writes `session[:company_id]`, and `settings_page` creates a `Tour` and `TourSetting` when they are missing |
| `api/v2/communities/*` (`get_products`, `get_community_detail_forms`, `move_to_production`, `update_products`) | Doorkeeper **token** auth (`Api::V2::ApiApplicationController#check_user_auth`), not the Devise session. Bridging the two is an auth decision still open (PYN_CONNECT_PROGRESS.md §11) |
| `api/v1/communities/:id/data.json` (Touch kiosk feed) | Unauthenticated and ignores the user's scope. It is a kiosk design payload and has none of the profile, contact, billing or settings fields |
| `api/partner/maps/sdk/*` | Needs a partner API key and an SDK session token |
| `analytics#get_associated_communities`, `companies#get_regions` | `[id, name]` pairs only |

---

## 2. Available from the existing backend (implemented)

| UI element | Field in the listing row | Rails origin |
|---|---|---|
| Breadcrumb, title, Property Name | `name` | `communities.name` |
| Status pill, "Current stage", lifecycle stepper (5 stages) | `stage` | Derived by `Connect::PropertySerializer#stage` from `date_activated`, `production_started_date`, `submitted_final_approval_date` and `released_date` |
| Subtitle: company · city · units | `company_name`, `city`/`state`, `unit_count` | `companies.name`; `communities.city` / `state`; `number_of_units`, else a count of `units` |
| City · State | `city`, `state` | `communities.city`, `communities.state` |
| Number of Units; Inventory → Units; Touch metric | `unit_count` | As above |
| Products: Touch / Tour / Maps on or off | `products.*` | `touchscreen_app` / `self_tour` (or `product_options`), `product_options.pynwheel_maps` / `enable_sdk_map` |
| Tour metric: stops configured or not | `tour_published` | The community's tour has at least one `tour_stop` |
| Edit Details (hand-off link) | `company_id`, `id` | Existing route `GET /companies/:company_id/communities/:id/edit`. No backend change |
| Access control (id not visible → "Property not found") | The listing scope | `AccessibleCommunitiesQuery#base_scope` (role rules from `HomeController#index`) |

---

## 3. Unavailable: requires future backend work

The "Required later" column assumes the phase 1 recipe (PYN_CONNECT_PROGRESS.md §11): a `format.json` branch on an existing controller, a `Connect::*Serializer`, scoping through `AccessibleCommunitiesQuery`, and the `ResponseEnvelope`.

### G1. Looking up one property

| | |
|---|---|
| **UI requirement** | Open `/properties/:id` quickly |
| **Backend investigated** | `GET /communities.json`, `AccessibleCommunitiesQuery`, `Connect::PaginatedCollection` (`MAX_PER_PAGE = 100`) |
| **Why the frontend cannot access it directly** | There is no id filter or show endpoint. `lookupProperty` walks the listing 100 rows at a time: one request, then the remaining pages in parallel. A super admin (802 properties) costs 9 requests, about 2–3 s in local dev. A company admin with a handful of properties costs 1 request |
| **Required later** | Either an `id` filter on `AccessibleCommunitiesQuery`, or a `format.json` branch on a single-record action (`communities#show`) returning a `Connect::PropertyDetailSerializer`. G2–G11 below need the second anyway |

### G2. Profile: Location

| | |
|---|---|
| **UI requirement** | Street Address; ZIP (in "City · State · ZIP"); Coordinates; "Auto-geocoded" / "Manual override" tag |
| **Backend investigated** | `communities.address`, `zip`, `latitude`, `longitude`, `manual_lat_long`, from the `communities/_form.html.haml` form (`CommunitiesController#edit`) |
| **Data exists?** | Yes. Locally, 764 of 803 have an address, 758 a ZIP and 765 a latitude; 6 are manual overrides |
| **Why the frontend cannot access it** | Not in `Connect::PropertySerializer`; `#edit` renders HTML only |
| **Required later** | Add these fields to a detail serializer (G1) |

### G3. Profile: Leasing Contact

| | |
|---|---|
| **UI requirement** | Phone, Email, Website |
| **Backend investigated** | `communities.phone`, `email`, `website` (same form) |
| **Data exists?** | Yes (620 / 677 / 647 of 803) |
| **Why the frontend cannot access it** | Not serialized for Connect |
| **Required later** | Detail serializer (G1) |

### G4. Profile: On-Site Team

| | |
|---|---|
| **UI requirement** | Property Manager, Manager Phone, Manager Email |
| **Backend investigated** | `communities.property_manager_name`, `property_manager_phone`, `property_manager_email` |
| **Data exists?** | Yes (109 of 803 have a manager name) |
| **Why the frontend cannot access it** | Not serialized for Connect |
| **Required later** | Detail serializer (G1) |

### G5. Profile: Configuration

| | |
|---|---|
| **UI requirement** | Property Map / Floorplates; Notes |
| **Backend investigated** | `communities.is_sitemap` (the form's "Property Map" / "Floorplates" radio) and `communities.description` (the form's "Notes") |
| **Data exists?** | Yes (481 map-mode; 50 with notes) |
| **Why the frontend cannot access it** | Not serialized for Connect |
| **Required later** | Detail serializer (G1). Note: the legacy form shows `units.count` as "Number of Units", while `unit_count` prefers the stored `number_of_units` |

### G6. Editing the profile in Connect

| | |
|---|---|
| **UI requirement** | "Edit Details" → inline form → Save Changes; Override Latitude/Longitude Manual/Auto |
| **Backend investigated** | `CommunitiesController#update` (`PATCH /companies/:cid/communities/:id`, `community_params`) |
| **Why the frontend cannot access it** | Answers `html` / `js` only. `protect_from_forgery` needs an authenticity token the proxy does not hold. Writes are also still an open decision (§11) |
| **Interim** | "Edit Details" opens the legacy Property Details form in a new tab (existing route, no change). The user signs in to the CMS there if needed, because Connect's Rails cookie lives on the Connect origin |
| **Required later** | A JSON `update` branch plus a CSRF strategy for the proxy, once writes are approved |

### G7. Product toggles (write) and product metrics

| | |
|---|---|
| **UI requirement** | Toggling Touch / Tour / Maps. Metrics "N units · M floorplates", "N tour stops", "N pins · M paths" |
| **Backend investigated** | Writes: `touchscreen_app` and `self_tour` via `communities#update` (settings page); `product_options` via `api/v2 update_products`. Metrics: `floorplates`, `tour.tour_stops`, `amenities`, the tour's paths |
| **Why the frontend cannot access it** | Writes as in G6 (and api/v2 is token auth). The only related count Connect gets is `tour_published`, a boolean |
| **Shown instead** | Read-only switches, unit count, "Tour stops configured" / "No tour stops yet", and Enabled / Not enabled for Maps |
| **Required later** | Floorplate, tour-stop, amenity and path counts in the detail serializer; a write path for the product flags |

### G8. Inventory counts and sub-communities

| | |
|---|---|
| **UI requirement** | Floorplans, Floorplates, Amenities; "{N} buildings"; Sub-communities with unit counts |
| **Backend investigated** | `community.floorplans`, `floorplates`, `amenities`, `sub_communities` (name, `property_id`). Units belong to a sub-community through `units.property_id = sub_communities.property_id` (`Community#fetch_multi_properties`) |
| **Why the frontend cannot access it** | Nothing exposes these counts or the sub-community list as JSON |
| **Required later** | Grouped counts in the detail serializer, as `Connect::CompanySerializer` already does for companies |

### G9. Property Settings

| | |
|---|---|
| **UI requirement** | **Pricing & Fees:** Display Price, Display Pricing Options (Matrix), Display Fees, Pynwheel Pricing Calculator, Engrain Pricing Calculator. **Unit Display:** Default Availability (All/Now), Display Available Date, Display Availability Over 120 Days, Display Building Number, Show All As Available, Hide Bedrooms & Bathrooms, Hide Square Feet, Hide Availability. **Property:** Community Logo, Student Housing Property, Inactivate Property |
| **Backend investigated** | Legacy Floorplates page `floorplates/index.html.haml`, form → `POST /communities/:id/save_apartment_settings` → `CommunitiesController#save_apartment_settings`. Columns: `display_rent`, `display_pricing_options`, `display_additional_fee`, `enable_pynwheel_pricing_calculator`, `enable_pricing_calculator`, `show_current_availability` (All/Now), `display_available_date`, `units_availability_over_120_days`, `display_building`, `turn_availability_on`, `hide_bedrooms_bathrooms`, `hide_square_feet`, `hide_availability`, `student_housing_property`. From `settings_page.html.haml` → `communities#update`: `community_logo`, `locked` (Inactivate) |
| **Data exists?** | Yes, every one is a `communities` column |
| **Why the frontend cannot access it** | Rendered only into HTML forms; writes are HTML form posts |
| **Required later** | The settings in the detail serializer (read); a JSON branch on `save_apartment_settings` / `update` (write) |

### G10. Billing Rate Card

| | |
|---|---|
| **UI requirement** | Touch Kiosk, Self-Guided Tour, Maps, Combined; "Monthly · {month}"; Edit Rates |
| **Backend investigated** | `communities.billing_rate_touch`, `billing_rate_selftour` (plus `lincoln_billing_rate` / `dwelo_billing_rate`, which the settings page shows instead for Lincoln and Dwelo), `billing_rate_maps`, `billing_rate_for_both` (Combined), `billing_month`, `billing_type`. Written by `communities#update_billing_rate` / `#update` from `settings_page.html.haml` |
| **Data exists?** | Partly. The rates are free-text strings; 525 of 803 have Touch/Tour/Maps rates, 61 a Combined rate. Caveat: the legacy form pre-fills `$2,028` / `$385` / `$295` / `$280` / `$50` when a rate is blank and saves them, and `$2,028` is the most common stored Touch rate (301 rows). `billing_type` is `annual` on every row (the design says "Monthly"); `billing_month` is blank on 562 |
| **Why the frontend cannot access it** | Not serialized for Connect |
| **Required later** | Rates, `billing_type` and `billing_month` in the detail serializer. The business must also decide whether the pre-filled defaults are real rates |

### G11. Lifecycle detail and changes

| | |
|---|---|
| **UI requirement** | The design's 7 stages (Order Received, Payment Received, Pre-Production, In Production, Released, Installed, Orientation) with descriptions; clicking a stage sets it |
| **Backend investigated** | The four milestone dates; `api/v2 move_to_production` (sets `submitted_final_approval_date` / `released_date`) |
| **Why the frontend cannot access it** | Five of the design's stages have no column. The dates are not serialized, only the derived `stage`. The write is token-auth api/v2 |
| **Shown instead** | The 5 real milestone stages, read-only |
| **Required later** | Milestone dates in the serializer. A lifecycle model or columns if the business wants the 7-stage process |

### G12. Per-product configuration cards (Touch, Self-Guided Tour, Maps)

| | |
|---|---|
| **UI requirement** | **Touch:** Touch Code, Display Type, Billing Rate, Subscription Start Date, MDU Mode, Show Gesture Icons, Show "Powered by Pynwheel". **Tour:** Entry QR Codes, Subscription Start Date, Require ID Verification, Enable Locks, Automate Wayfinding. **Maps:** Map Display Type, Default Map To Load On Floor, Beans.ai 3D Maps, Beans Generated SVG, Enable SVG Mode, Enable SDK Map, Display Floor Plan Colors, Highlight Floor Plan On Hover |
| **Backend investigated** | `communities.code`, `is_vertical_app`, `date_installed`, `mdu`, `show_gesture_icons`, `powered_by_btn`, `enable_locks`, `auto_wayfinding`, `enable_three_d_maps`, `is_beans_svg`, `enable_svg_mode`, `enable_sdk_map`, `default_map_floor`, `enable_floorplan_level_color`, `highlight_all_units_on_hover`; `tours.visual_id_verification`. Rendered by `settings_page.html.haml` and `floorplates/index.html.haml`. No per-product subscription start date column was found; `date_installed` is the nearest |
| **Why the frontend cannot access it** | Not serialized for Connect. The listing reduces locks, identity and PMS to three state keys |
| **Required later** | Detail serializer fields; write path as in G9 |

### G13. ILS Syndication

| | |
|---|---|
| **UI requirement** | Per-partner "Syndicating / Paused" toggles for this property |
| **Backend investigated** | `PartnerConfigurationsController` (`Community::MAP_PARTNER_KEYS`, `Community#partner_map_enabled?`; `update_property` answers JSON on write only; `index` is HTML) |
| **Why the frontend cannot access it** | No JSON read of a property's partner state |
| **Required later** | The enabled partners in the detail serializer (`enabled_partners(community)` already exists in the controller) |

### G14. Destinations of "Manage This Property"

| | |
|---|---|
| **UI requirement** | Inventory, Map & Plotting, Integrations and Branding open this property's screens |
| **Why the frontend cannot access it** | Those screens still run on demo data (phase 2). A real id reaches their "No demo property" state, as the listing's Go To buttons already do (phase 2c) |
| **Required later** | The phase 3 JSON endpoints for those screens (PYN_CONNECT_PROGRESS.md §11). The links need no change |

---

## 4. Property Inventory (added September 24, 2026)

**Branch:** `feature/inventory_implementation`, on top of `feature/properties_detail_page` (`824c1f07a`).
**Brief:** `feature_inventory_page.md`.
**Target design:** `pyn-connect-22-sep-new.html`, screen `tourContent` ("Property Inventory") and its dialogs.
**Related:** [PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md) §17 · [context.md](context.md) §13.

### How the inventory data is read

None of the four legacy inventory actions answered JSON, so without a backend change nothing on the page could be read. With the user's explicit approval (Sep 24), under the same rule as §0 ("returning the data in the required format, no change in business logic or flow"), each action gained a **read-only `format.json` branch**. The branch serializes the records the action already loads:

| Endpoint | Action | Records (the action's own query) |
|---|---|---|
| `GET /communities/:id/floorplates.json` | `FloorplatesController#index` | `current_community.floorplates.order(id: :desc)` |
| `GET /communities/:id/floorplans.json` | `FloorplansController#index` | `@community.floorplans.order(id: :desc)` |
| `GET /communities/:id/units.json` | `UnitsController#index` | `UnitFilterQuery.new(@community, filter_params).results.includes(:door)`, returned before the grid's paging and its one-time `welcome_unit_page` write |
| `GET /communities/:id/amenities.json` | `AmenitiesController#index` | `current_community.amenities.order(id: :desc)` |

**What stays exactly as it was:** routes, queries, models, the schema, the HTML paths and authorization (`authenticate_user!` and each controller's `check_community`).

**The one flow difference:** for these four JSON reads only, `ApplicationController#community_code` and `#load_tour_users_chats` are skipped (`Connect::InventoryJson`).
- `community_code` creates a missing Tour/SchedulerWidgetSetting on any request carrying a `community_id`; 11 properties lack one locally.
- `load_tour_users_chats` builds the HTML layout's chat sidebar.

**Verified:**
- Zero INSERT/UPDATE/DELETE statements across 16 JSON reads on 4 properties, including property 3325, which has no SchedulerWidgetSetting (`scheduler_widget_settings` 792 → 792).
- The company admin gets 200 for their own property and a 302 for another company's.
- Signed out gets 401.
- The HTML pages still render.

Everything the database holds for floorplates, floorplans, units and amenities is now shown for real. The gaps below are only the design elements no existing column, table or controller can supply, and the write paths.

**Updates to earlier entries:**
- **G8** (inventory counts): the Inventory page now reads every count from these endpoints. The Property Detail page gets its counts from `communities#edit.json` (§0).
- **G14** (Manage This Property destinations): **Inventory** and **Map & Plotting** are now real for numeric ids (Sep 25). Integrations, Branding and Tour Setup are still demo.

## Gap: G15. Background Library (named, reusable floorplate backgrounds)

### UI Requirement
A property-level library of named raster backgrounds ("Site Aerial · site-aerial.jpg · 1.8 MB · 2400 × 1600"), each assignable to any number of floorplates, with a per-floorplate "Background" picker and "Used by N floorplates".

### Existing Backend Investigation
- `floorplates` columns: `image` (the raster map, `SiteMapUploader`), `svg_image`, `label_image`, `standard_image_url`, `svg_image_url` (a rasterised `svg_for_metro` copy, not the SVG), `width`, `height`, `svg_metadata`.
- `communities.background_svg_image`: the single shared base map of a Beans property. Every floor SVG overlays it (`SvgOptimizableMap`). The legacy Floorplates page shows its uploader for `is_beans_svg?` properties. Locally 1 of 803 properties has one.

### Current Limitation
- There is no background table, background name, floorplate→background assignment or stored file size.
- A floorplate's `image` is its own map picture, not a shared layer.
- Whether an SVG embeds a raster is only known by parsing it (`SvgOptimizerController#analyze`, which is super-admin only).

### Future Backend Requirement
A `floorplate_backgrounds` table (`community_id`, `name`, uploader, `byte_size`, `width`, `height`) plus `floorplates.background_id`, with JSON read and write. Alternatively, a business decision that `background_svg_image` is the only shared layer.

### Current Frontend Behavior
- The library lists the real shared background (`background_svg_image`) when the property has one, with a working Preview. Otherwise it shows an explanatory empty state.
- The name field, Upload Background, Replace and Delete are shown disabled, with the reason.
- The floorplate Background field reads "Shared background map" or "No separate background".
- Each floorplate's own image is shown on its card and in the viewer.

## Gap: G16. Tour publish state ("4 stops staged · not yet published")

### UI Requirement
The Inventory header says whether the tour is live or only staged.

### Existing Backend Investigation
- `tours` has no `published`, `published_at` or status column.
- `tour_stops` (`display_stop`, `sort`) belong to `Community#community_tour`.
- The listing's `tour_published` only means the tour has at least one stop.

### Current Limitation
Nothing records a publish event, so "staged" and "live" cannot be told apart.

### Future Backend Requirement
A publish state (flag and timestamp) on `tours`, set by the Tour Setup publish flow.

### Current Frontend Behavior
The header shows the real stop count ("7 tour stops" or "No tour stops yet") and makes no published or unpublished claim.

## Gap: G17. Floorplan marketing badges

### UI Requirement
Coloured badges on floorplan cards ("Limited Availability", "1 Month Free"), a badge library, and "Add badge" / "Edit badges".

### Existing Backend Investigation
- There is no badge model or table in `app/models`.
- The nearest real value is `floorplans.availability_status` (available / limited_availability / almost_gone / sold_out). The legacy Floor Plans page offers it only when `communities.turn_availability_on` is set.

### Current Limitation
Badge text, colour, size and assignment are not stored.

### Future Backend Requirement
A community-level badge table and a floorplan↔badge join, with JSON read and write.

### Current Frontend Behavior
Badges and the badge dialog are not rendered. `availability_status` is shown as a pill when the property has floor-plan availability on, as on the legacy page. Locally it is `available` on 14,615 of 14,616 floor plans.

## Gap: G18. Floorplan "Directional Text"

### UI Requirement
The Add/Edit Floor Plan dialog's "Directional Text" (shown above the image on the self-guided tour).

### Existing Backend Investigation
`floorplans` has `description`, `description_title` and `show_description_on_card`, but no directional-text column. Units keep theirs in `units.stop_description`, which the Unit dialog uses.

### Current Limitation
There is no column to read.

### Future Backend Requirement
A `floorplans.stop_description` (or similar) column, if floor plans need one.

### Current Frontend Behavior
The field is shown empty and disabled, with a note.

## Gap: G19. Uploaded-file metadata (size; dimensions outside floorplates)

### UI Requirement
Upload rows read "JPG · 1.4 MB · 1280 × 960"; background rows show a size.

### Existing Backend Investigation
- The CarrierWave mounts on `floorplates`, `floorplans`, `units`, `amenities`, `amenity_galleries` and `communities` store only the file identifier.
- Only floorplates keep `width`/`height` and `svg_metadata`.

### Current Limitation
The size needs an S3 request per file, and the dimensions need a download.

### Future Backend Requirement
Store `byte_size`, `width` and `height` at upload, or add a metadata endpoint.

### Current Frontend Behavior
Upload rows show the real file name and type. Floorplates also show their stored dimensions. Size is never shown.

## Gap: G20. Inventory write actions

### UI Requirement
The flows below should change data:
- Add, Edit and Delete for floorplates, floorplans, units and amenities
- Upload, Replace and Remove for SVGs and images
- Plotting
- Mass Overrides
- Re-sync from PMS
- The amenity category and gallery ordering

### Existing Backend Investigation
Every flow exists in the legacy CMS as an HTML form post, or as a GET with side effects. None answers JSON:
- `FloorplatesController#create/update/destroy`
- `FloorplansController#create/update/destroy`, `remove_pri_scnd_image`
- `UnitsController#create/update/destroy` and the mass overrides: `set_manual_override`, `set_available`, `set_floor`, `set_building`, `set_floorplan`, `set_sold`
- Re-sync: `CommunitiesController#import` / `update_community_data`, which queue provider syncs
- `AmenitiesController#update`, `amenity_galleries`

All sit behind `protect_from_forgery`.

### Current Limitation
- The Connect proxy holds no CSRF token, and the brief keeps Connect read-only.
- Several flows run side effects that belong to the legacy flow: provider syncs, `AssignFloorplanImagesToUnitJob`, tour-stop and path cleanup.

### Future Backend Requirement
JSON branches on those actions and a CSRF strategy for the proxy (as G6/R5), once the phase 3 "read-only or real writes?" decision is made.

### Current Frontend Behavior
- Every action is visible.
- Add and Edit open the full 22-Sep dialogs. Edit is prefilled with the record's real values.
- Save, Apply and Run Sync only close the dialog. The footer and confirm text say nothing is saved; no request is sent and no success message is shown.
- Delete and Remove open the shared confirm dialog, which only closes.
- Plotting and Map & Plotting link to the real Map & Plotting screen (Sep 25; its own write gaps are M1–M9 in `gaps_map_plotting_feature.md`); Tour Setup is still the demo screen.
- Verified in real Chrome: the browser issued only GETs, and the CMS side received only the four inventory GETs per page load.

## Gap: G21. Unit-level "Almost gone" availability

### UI Requirement
Unit availability as Available / Almost gone / Occupied (the design's unit dialog and availability filter).

### Existing Backend Investigation
- `units.available`, `available_date`, `availability` (Unoccupied/Occupied) and `sold`.
- `UnitFilterQuery#apply_availability` (`true` / `false` / `now` / `upcoming`).
- "Almost gone" exists only at floor-plan level.

### Current Limitation
Units carry no "almost gone" state.

### Future Backend Requirement
None, unless the business wants a unit-level state (a column, or a rule on `available_date`).

### Current Frontend Behavior
Availability uses the CMS's real states: **Available now**, **Available {date}** (upcoming), **Not available**, **Sold**. Sold wins over the others, as in UnitFilterQuery and the `sold` flag.

### Data observations (not backend gaps)
- **Some stored image files cannot be served.** For example, property 2919's floor plan images return 403 from S3 on both the plain and the accelerated host. The cards and the viewer say "Image unavailable" / "This image could not be loaded"; the legacy page shows a broken image.
- **In development, uploader-only files resolve to paths on the CMS host** (`/uploads/...`), because the uploaders use `:file` storage there and the files are not on this machine. These are SVGs, secondary images and gallery photos. On staging and production they are S3 URLs. Raster images that carry a `standard_image_url` load from S3 everywhere.

---

## 5. Property Detail and Inventory improvements (September 25, 2026)

**Branch:** `feature/properties_inventory_improvments`. **Related:** PYN_CONNECT_PROGRESS.md §18, context.md §14.

### Closed in this pass (existing data, minimal JSON exposure)

| Was | Now |
|---|---|
| Unit Detail "Lease-Term Pricing" had no known source (§4, G-note under proto-units) | `units.json lease_terms` from the existing `Unit#get_lease_term_pricing_matrix` (`units.lease_pricing`, shown only when `communities.display_pricing_options` is on, as on the kiosk). Not a gap |
| Unit Detail "pin at X%, Y%" | `units.json x_plot` / `y_plot` over the floorplate's stored `width` / `height`. SVG-pointer placements (`pointer_data`) have no pixel position, so they read "—" while still "Plotted" |
| Property Detail "{N} buildings" | `edit.json inventory.buildings` (distinct `building` over units ∪ amenities; the CMS has no buildings table) |
| `edit.json` created a Tour / SchedulerWidgetSetting for a property lacking one | The callback is skipped for that JSON read; the HTML page keeps its behaviour |
| `floorplates.json` / `amenities.json` 500 on an unknown id | 404 |

### Presentation notes (not gaps)

- The design's Lease-Term panel says "Inherited from {floor plan}" with 6 / 12 / 18-month tiles. The CMS matrix is **per unit**, with whatever terms the feed sends (3–18 months on 531). Connect shows the unit's own terms and highlights the 12-month tile when present.
- The design's Unit Data subtitle describes typing to mark a field Manual; Connect's inputs are disabled, so the subtitle states the sync rule instead.
- The Maps card's two selects hold the stored value as their only option (Map Display Type / Default Map floor do not map onto the design's option lists; see §0).

### Still gaps (unchanged)

G15 background library, G16 publish state, G17 badges (the "Add badge" button and badge dialog are therefore not rendered), G18 directional text, G19 file metadata, G20 every write (incl. Add Company / Add Property on the listings, gallery reordering and Toggle on Unit Detail), G21 unit "almost gone"; R1–R5 on Property Detail. Map & Plotting and Tour Setup remain demo screens, so "View on Plan" / "Plot on Plan" and the floorplate "Plotting" button open them.
