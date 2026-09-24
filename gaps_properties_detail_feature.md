# Property Detail: backend and data-access gaps

**Date:** September 24, 2026
**Branch:** `feature/properties_detail_page`
**Target design:** `pyn-connect-22-sep-new.html`, screen `isPropertyDetail`
**Related:** [PYN_CONNECT_PROGRESS.md](PYN_CONNECT_PROGRESS.md) §15 · [context.md](context.md) §11

This file lists what the Property Detail page could and could not read from the **existing** Rails backend. The brief ruled out backend changes: no migrations, columns, APIs, serializers, controller, model or route changes. Everything under "Unavailable" is therefore left out of the page. Nothing is shown with a placeholder value.

Only backend and data-access gaps are listed here. Frontend work that the existing data would already support is not.

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
