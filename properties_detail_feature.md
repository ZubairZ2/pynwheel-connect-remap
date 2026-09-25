You are continuing the Pynwheel Connect React migration in:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

## Objective

Implement the **Property Detail page** that opens when a user clicks a Property card from the Properties listing.

The target UI is defined in:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html`

The existing React app already has Login, Companies, and Properties listing implemented.

This task is specifically for the **Property Detail page and its related detail/settings sections**.

---

## 1. Read the project context first

Before changing anything, read:

* `/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`
* `/Users/zubairzulifqar/pynwheel-staging/context.md`
* `/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html`
* `/Users/zubairzulifqar/pynwheel-staging/pyn-connect-new.html`

The second HTML file is the older UI and should be used to understand the existing flows and terminology.

Also inspect the current React implementation and identify existing reusable components before creating anything new.

---

# 2. First understand the existing Rails/backend flow

The old system is implemented as HTML/ERB, so **walk through the existing old Property Detail implementation in the Rails application**.

Find and inspect:

* Property Detail controller/action
* Routes
* Models
* Associations
* Queries/scopes
* Existing presenters/serializers/parsers/decorators
* Existing forms
* Existing settings controller/actions
* Property Map/Floorplates related controllers/actions
* Billing/rate-card related backend code, if it exists
* Any existing authorization logic

Trace:

**Controller → Action → Model → Associations → Data shown in the old UI**

The old Property Detail page contains fields such as:

* Name
* Address
* City
* State
* ZIP
* Latitude
* Longitude
* Override Latitude/Longitude
* Phone
* Email
* Property Manager Name
* Property Manager Phone
* Property Manager Email
* Website
* Number of Units
* Property Map / Floorplates
* Notes

The old Floorplates / Property Map settings page also contains many settings that appear in the new Property Detail UI.

The labels are intentionally very similar between old and new systems, so use the old implementation to locate the real backend source.

---

# 3. First deliverable: create a complete change/data-source map

**Do not start coding immediately.**

First compare:

1. `pyn-connect-new.html` — old UI
2. `pyn-connect-22-sep-new.html` — improved UI
3. Current Companies implementation
4. Current Properties implementation
5. Existing Rails Property Detail implementation

Create an ordered map containing:

| New UI Section | Old UI / Rails Source | Existing React Component | Backend Data Source | Available to React? | Required Change |
| -------------- | --------------------- | ------------------------ | ------------------- | ------------------- | --------------- |

Cover:

* Property Profile
* Products
* Inventory
* Property Settings
* Floorplates / Property Map
* Billing Rate Card
* Shared UI elements
* Navigation/actions

Also identify every field that can be populated from real existing backend data.

**Do not hard-code prototype values.**

---

# 4. Property Detail UI to implement

Use:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html`

as the target/source of truth.

## Property Profile

Title:

**Property Profile**

Subtitle:

**Identity, location and contacts · shared by every product surface**

Action:

**Edit Details**

### Location

* Property Name
* Street Address
* City · State · ZIP
* Coordinates
* Auto-geocoded

### Leasing Contact

* Phone
* Email
* Website

### On-Site Team

* Property Manager
* Manager Phone
* Manager Email

### Configuration

* Number of Units
* Property Map / Floorplates
* Property Map
* Notes

Use real property data from the backend.

---

# 5. Products

Implement the Products section from the improved UI:

* Pynwheel Touch
* Self-Guided Tour
* Pynwheel Maps
* Inventory

Also implement the Inventory summary:

* Units
* Floorplans
* Floorplates
* Amenities
* Sub-communities
* Unit counts per sub-community

Find the actual backend sources.

Do not use dummy values where real data exists.

---

# 6. Property Settings

Implement the settings shown in the new UI, including:

### Pricing & Fees

* Display Price
* Display Pricing Options (Matrix)
* Display Fees
* Enable Pynwheel Pricing Calculator
* Enable Engrain Pricing Calculator

### Unit Display

* Default Availability
* Display Available Date
* Display Availability Over 120 Days
* Display Building Number
* Show All As Available
* Hide Bedrooms & Bathrooms
* Hide Square Feet
* Hide Availability

### Property

* Community Logo
* Student Housing Property
* Inactivate Property

Trace every setting to the existing Rails implementation.

The old Floorplates / Property Map page contains related settings, so inspect its controller, model fields, form and persistence flow.

---

# 7. Billing Rate Card

Implement the Billing Rate Card only when the existing backend already contains the required data.

Reference UI:

**Billing Rate Card**

**Per-property rates · Monthly · February 2026**

**Edit Rates**

Products:

* Touch Kiosk
* Self-Guided Tour
* Maps
* Combined

Do not hard-code prototype prices.

Search the existing backend for rate-card/billing/product pricing data.

If the data exists, consume it.

If it does not exist or cannot be accessed without backend changes, document it as a gap.

---

# 8. Real backend data — mandatory

For every field:

1. Find where the old Rails UI gets it.
2. Identify the model/association/query.
3. Identify whether the data is already exposed to React.
4. Reuse the existing backend/API/data source.
5. Map that data into the existing React UI.

**Do not create dummy/mock production data when the backend already has the information.**

The goal is to make the Property Detail page work with **real existing backend data**.

---

# 9. No backend changes

> **Superseded on September 24, 2026** by "Revised backend rule" (section 9a, below). The text of this section is kept for history.


Do **not** modify the Rails backend for this task.

Do not create:

* migrations
* database columns
* new backend APIs
* new serializers
* controller changes
* model changes
* routes
* backend enablement flags

Use the existing backend as-is.

When something required by the UI is unavailable to the React frontend, leave that portion unimplemented and document it in:

`/Users/zubairzulifqar/pynwheel-staging/gaps_properties_detail_feature.md`

For every gap document:

* UI requirement
* Existing backend source investigated
* Why the current frontend cannot access it
* What would be required later

---


# 9a. Revised backend rule (September 24, 2026)

This replaces section 9. The previous requirement of **"no backend changes at all" is slightly relaxed**.

Minimal backend/controller changes are allowed **only when they are required to expose existing data to the Next.js frontend as JSON**.

## Allowed backend changes

* Modify the existing Rails controller/action to return JSON.
* Add a JSON response/format to an existing controller action.
* Shape/transform the existing data into a JSON structure that is convenient for the Next.js frontend.
* Include existing associations/fields in the JSON response.
* Reuse the existing queries, models, associations, scopes and business logic.
* Add only the minimal serialization/mapping needed to expose existing data.

For example, an existing action can keep its current business logic and additionally support:

```ruby
respond_to do |format|
  format.html
  format.json { render json: ... }
end
```

or return a frontend-friendly JSON structure built from the **same existing records and logic**.

## Strict restrictions

Even though controller changes are now allowed, **do not change the application's business logic**. Do NOT:

* change business rules, calculations or validations
* change authorization behavior
* change existing queries unless absolutely necessary to expose already-existing data
* change scopes, model behavior or associations
* change the database schema, add migrations or add new columns
* change existing write behavior
* introduce new business logic
* alter existing production behavior
* remove or replace existing Rails functionality

The backend change is limited to: **reading existing data and exposing it as JSON for the Next.js frontend.**

## Preferred implementation approach

1. Find the existing Rails controller/action used by the old UI.
2. Understand exactly how it currently gets the data.
3. Reuse the same models, associations, queries and business logic.
4. Determine the minimum JSON structure the React page needs.
5. Add a JSON response to the existing controller/action where possible.
6. Do not duplicate business logic in a new controller.
7. Do not create a new API endpoint if an existing controller/action can reasonably serve the JSON.
8. Do not introduce a serializer layer unless the project already uses one or it is clearly the smallest appropriate change.

**Data-source priority:** existing Rails controller/action → existing models and associations → existing queries/scopes/business logic → minimal JSON transformation → Next.js frontend.

**Avoid,** unless there is genuinely no alternative: a new controller, new business logic, new database structure, new duplicate queries.

## Real data (unchanged)

The frontend must still use **real existing database data**. Do not hard-code prototype values from `pyn-connect-22-sep-new.html`; the prototype is only the UI and structure reference.

## Write operations remain disabled

The React implementation stays **read-only**. Do not enable create, update, delete, upload, sync, mass update or edit/save. Where the UI contains write actions, implement the UI/modal as the prototype shows it, but do not perform the mutation.

## When backend work is still required

If the data cannot be exposed through a minimal controller/JSON change without changing business logic or introducing broader backend changes, do NOT implement that change. Document it in `gaps_properties_detail_feature.md` with:

* the UI requirement
* the existing Rails source investigated
* the existing model/data source
* why the existing data cannot currently be exposed
* why a simple controller/JSON response is insufficient
* what future backend work would be required

## Documentation

Add a new dated entry to `PYN_CONNECT_PROGRESS.md` and `context.md` covering:

* which controllers were changed
* what JSON was exposed
* which existing models/associations provide the data
* confirmation that business logic was not changed
* confirmation that no schema or migration changes were made
* confirmation that write operations remain disabled
* any remaining gaps

Do not remove existing documentation or history.

**Principle:** use the existing Rails backend as the source of truth, and make the smallest possible controller-level changes needed to expose that data as frontend-friendly JSON. "Backend change allowed" is not permission to redesign the backend. Keep changes minimal, localized, read-oriented and presentation-focused.

# 10. Reuse existing React components

Before creating any new component, search the current React codebase.

Reuse existing:

* Cards
* Detail sections
* Buttons
* Toggles
* Forms
* Layouts
* Tabs
* Shared styles
* Navigation
* Modals
* Tables
* Pagination

Only create a new component when an existing component cannot reasonably support the requirement.

Do not create duplicate components.

---

# 11. Property navigation

Clicking a Property card from the Properties listing must open the corresponding Property Detail page.

The selected property must be determined dynamically from the actual selected property.

Do not hard-code property IDs or property data.

Use the existing routing/navigation conventions.

---

# 12. UI fidelity

The target is:

`pyn-connect-22-sep-new.html`

The old UI:

`pyn-connect-new.html`

is the baseline for understanding the previous behavior and terminology.

Match the improved UI as closely as practical:

* Layout
* Typography
* Spacing
* Cards
* Borders
* Icons
* Buttons
* Badges
* Toggles
* Sections
* Data presentation
* Empty states
* Responsive behavior

---

# 13. Documentation — ADD to existing files

This is important:

**Do not simply overwrite or replace the existing documentation. Add a new dated section/entry to both files. Preserve the existing history/context.**

Update:

`/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`

and:

`/Users/zubairzulifqar/pynwheel-staging/context.md`

### PYN_CONNECT_PROGRESS.md

Add a new dated section for this Property Detail feature.

Include:

* Feature/task name
* Investigation completed
* Change/data-source mapping completed
* Sections implemented
* Components reused
* New components created and why
* Real backend data consumed
* Testing completed
* Remaining gaps
* Link/reference to `gaps_properties_detail_feature.md`

Keep the existing progress entries intact.

### context.md

Add a new dated context entry documenting the implementation knowledge discovered during this work.

Include:

* Property Detail flow
* Old Rails controller/action used
* Important models/associations discovered
* Existing backend data sources
* React components reused
* Important UI/data mapping decisions
* Backend limitations/gaps
* Any conventions that should be followed for future Property Detail work

Do not delete or rewrite existing context unless correcting an objectively outdated statement. Prefer adding a new dated entry.

### gaps_properties_detail_feature.md

Create or update this file with only genuine backend/data-access gaps.

Separate:

**Available from existing backend**

from:

**Unavailable / requires future backend work**

Do not put already-solvable frontend work into this file.

---

# 14. Implement one item at a time

Once the investigation and change map are complete:

1. Pick the first missing item.
2. Inspect existing code.
3. Reuse an existing component where possible.
4. Implement the smallest required change.
5. Test it with real data.
6. Mark it complete.
7. Move to the next item.

Do not bundle unrelated changes together.

---

# 15. Testing with real data

Test using actual properties from the existing environment.

Verify:

* Properties listing → Property Detail
* Correct property is loaded
* Property Profile values
* Address/location
* Coordinates
* Contacts
* Manager information
* Units
* Property Map/Floorplates
* Products
* Inventory
* Sub-communities
* Property Settings
* Billing Rate Card where available
* Missing-data states
* Navigation back to Properties
* Login
* Companies
* Existing Properties functionality
* No console/runtime errors

Do not mark a section complete unless it has been tested against real backend data.

---

# 16. Final diff review

Before finishing:

* Review `git diff`
* Ensure no unrelated files changed
* Ensure no Rails/backend files changed
* Ensure no migrations were added
* Ensure no dummy data remains where backend data exists
* Ensure no unnecessary duplicate React components were created
* Ensure Login, Companies and Properties still work

---

# Execution order

Follow this order exactly:

### Phase 1 — Investigation

Read documentation, both HTML prototypes, current React code, and old Rails implementation.

### Phase 2 — Change/Data Source Map

Map every new Property Detail field/section to its old UI/backend source and React implementation.

### Phase 3 — Gap Identification

Identify what is and is not available from the existing backend.

### Phase 4 — Implementation

Implement the Property Detail page section by section.

### Phase 5 — Real Data Testing

Run the app and test using actual backend data.

### Phase 6 — Documentation

**Add new dated entries** to:

* `PYN_CONNECT_PROGRESS.md`
* `context.md`

And create/update:

* `gaps_properties_detail_feature.md`

### Phase 7 — Final Review

Review UI, behavior, real data, console errors and git diff.

---

## Final response

Provide:

1. Investigation summary
2. Complete change/data-source map
3. Implemented sections
4. Existing React components reused
5. New components created and why
6. Real backend data successfully consumed
7. Gaps documented
8. Files changed
9. Testing performed
10. Documentation additions made to `PYN_CONNECT_PROGRESS.md` and `context.md`
11. Remaining issues

**Start with investigation only. Do not modify code until you have inspected both HTML prototypes, the current React implementation, the existing Rails Property Detail flow, and created the change/data-source map.**

---

# Status update — September 25, 2026 (branch `feature/properties_inventory_improvments`)

The page runs on `GET /communities/:id/edit.json` (§16 of PYN_CONNECT_PROGRESS.md). This pass (§18) closed the remaining differences from the 22-Sep design that existing data supports:

- **Controls:** Default Availability, Touch Code, Display Type, Billing Rate, Subscription Start Date, Map Display Type and Default Map floor now render as the design's form controls, disabled, showing the stored values (`ConfigRow` kinds `input` / `date` / `select`).
- **Inventory panel:** the four stat cards open their own Inventory tab; the subtitle is "{N} buildings · {M} sub-communities" from the new `inventory.buildings` key (distinct `building` over units and amenities).
- **Controller:** `edit.json` no longer runs the write-on-GET `community_code` callback (skipped for that JSON read only).

Data sources are unchanged (§16 table). Reused: `DetailSection`, `Switch`, `StatusPill`, `.bo-field`. No new components.
Remaining gaps: R1–R5 in the gaps doc; "Add Property" on the listing is not built (writes are disabled by rule).
