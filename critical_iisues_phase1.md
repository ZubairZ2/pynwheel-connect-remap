# CRITICAL ISSUES — IMPLEMENT CAREFULLY AND TEST EACH ONE

Before making any changes, **read these files completely**:

* `/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`
* `/Users/zubairzulifqar/pynwheel-staging/context.md`
* `/Users/zubairzulifqar/pynwheel-staging/react-architecture.md`
* `/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md`

Also review the existing feature/gap documentation relevant to:

* Map & Plotting
* Wayfinding
* Inventory
* Amenities
* Companies
* Properties
* Property Detail

Review the referenced screenshots from the paths provided below before implementing the corresponding issue.

## General implementation rules

These are **existing-product fixes**, not a redesign.

* Use the current Next.js architecture and existing components wherever possible.
* Reuse existing APIs/data-loading/serialization patterns.
* Use real DB data.
* Do not hardcode property/company/product status.
* Do not introduce DB schema changes.
* Do not change business logic or authorization.
* Backend changes are allowed only when required to expose existing DB data in JSON.
* Do not introduce mutation requests where the current migration is intended to remain UI/local-state only.
* Do not remove existing functionality unless explicitly requested below.
* Fix root causes rather than adding visual workarounds.
* Test each issue against real data, especially **John Demo / Property 1411**.

---

# ISSUE 1 — Map must not display unit/amenity numbers or labels by default

### Current problem

On the Map & Plotting page, the map currently displays text such as:

```text
142-A
141-A
```

for units/amenities.

These labels should **not be permanently visible on the map**.

The map should primarily show the polygons indicating where the plotted unit/amenity exists.

### Required behavior

By default:

* Show the actual unit/amenity polygons.
* Do not render persistent unit numbers/names such as `142-A`, `141-A`.
* Do not render unnecessary numeric/debug information.
* Do not obscure polygon geometry with text.

When the user **hovers over a plotted unit or amenity polygon**, show the same information that is currently displayed when the user clicks that polygon.

Use this screenshot as the visual reference:

`/Users/zubairzulifqar/pynwheel-staging/critical_issues_pictures/image16.png`

### Important interaction requirement

The hover information should represent the existing click information rather than creating a separate simplified tooltip.

Trace the existing click behavior and reuse the same data/display component where practical.

The result should be:

```text
Normal state
→ Polygon only

Hover
→ Polygon remains visible
→ Existing polygon detail information appears

No hover
→ Detail information disappears
```

Make sure hover works for:

* Units
* Amenities
* Additional Stops where applicable

Do not hardcode the information shown in the hover state.

Also ensure labels/details do not become permanently visible again when zooming, changing floors, switching Plotting/Wayfinding, or re-rendering the map.

---

# ISSUE 2 — Fix all dropdown hover gaps

### Current problem

The dropdown:

```text
Plot on Map

1 · Floor 1 · 2 of 2 plotted

Show
Units
```

opens the options:

```text
Choose what to list for plotting

Units
Units from the data feed

None here

Amenities
Amenities from the data feed

All plotted

Additional Stops
Entries, elevators, stairs, blockers and other self-tour stops
```

There is currently a **physical gap between the trigger and the dropdown menu**.

When the mouse moves through that gap, the dropdown closes before the user can reach the options.

Reference:

`image9.png`

### Required behavior

Fix the dropdown interaction so that:

* The menu remains open while moving from the trigger to the options.
* There is no hover dead-zone/gap.
* Moving diagonally toward an option does not close the menu.
* Clicking an option works reliably.
* Moving inside the menu keeps it open.
* Leaving the complete dropdown area closes it appropriately.

### Important

Do not fix this only for the current **Plot on Map** dropdown.

**Audit the entire application for the same dropdown implementation/pattern.**

Find every occurrence where a trigger opens a floating dropdown/menu and apply the appropriate shared fix so this problem does not exist elsewhere.

Prefer fixing the shared dropdown component/positioning logic rather than adding one-off CSS to individual screens.

Test at all relevant occurrences.

---

# ISSUE 3 — Hide plotting markers while the map is loading

### Current problem

While the Map & Plotting page is loading, the loading cat is displayed, but red/yellow markers are already visible in the background.

This creates confusion because some of those pointers do not appear in the final rendered state.

Reference:

`/Users/zubairzulifqar/pynwheel-staging/critical_issues_pictures/image18.png`

Test on:

```text
Properties
/
John Demo
/
Map & Plotting
```

### Required behavior

During the map loading state:

* Keep the existing loading cat.
* Do not render red/yellow/blue plotting markers yet.
* Do not render incomplete/stale plotting overlays.
* Do not display partially loaded graph/marker state.

Once the map is fully ready:

* Remove the loading state.
* Render the normal map.
* Restore the existing post-load marker behavior exactly as intended.

Important:

**Do not remove or change the actual marker behavior after loading.**

This is only a loading-state rendering problem.

The loading state should effectively be:

```text
Map loading:
Loading cat
+ map/background as appropriate
- plotting markers
- partial graph overlays
- stale previous-floor markers
```

Then:

```text
Map ready:
Normal map
+ all correct current-floor plotting state
```

Also verify that changing floors does not briefly display markers from the previous floor.

---

# ISSUE 4 — Single-building layout + Wayfinding row alignment/wrapping

## 4A. Hide Building section when there is only one building

On Map & Plotting, when there is only **one building**, do not show the Building section.

Example:

```text
Building

A
```

This section should only appear when there are **multiple buildings** to choose from.

When multiple buildings exist:

* Keep the building selector.
* Show the available buildings normally.
* Selection must continue to work.

This must be data-driven from the actual number of available buildings.

Do not hardcode "A".

---

## 4B. Wayfinding toggle/content alignment

Current row contains something similar to:

```text
[+/-] Wayfinding
A · Floor 1
24 points · 23 paths
```

The text beside the Wayfinding toggle should be **vertically centered relative to the Wayfinding toggle/control**.

Reference:

`image4.png`

### Long text problem

When the Wayfinding information becomes long, the delete/remove icon currently gets pushed onto another line.

This must never happen.

Required behavior:

* Keep the action/delete icon in its fixed action area.
* The text area may wrap onto multiple lines.
* Only the text should grow/wrap.
* The action icon must remain aligned and visible.
* The surrounding row should remain structurally stable.

Use a layout similar to:

```text
| toggle | expandable text area            | action |
|        | long text wraps here            | icon   |
```

Do not allow the action icon to become part of the text wrapping flow.

Test with:

* short text;
* normal text;
* very long text;
* multiple lines;
* narrow desktop widths.

---

# ISSUE 5 — Add zoom controls to all image-preview modals

There are multiple places where an **eye icon** opens an image in a larger modal/viewer.

Example:

```text
Floorplates
7

Floorplans
20

Units
356

Amenities
```

### Required behavior

Any image-preview modal opened by an eye/view action should provide the same type of controls currently available on Map & Plotting:

* Zoom In
* Zoom Out
* Reset

The image viewer should allow:

* zooming in;
* zooming out;
* resetting to the initial scale;
* maintaining the correct image aspect ratio;
* viewing the image without distortion.

### Important

Do not implement this separately in every feature.

First identify whether there is already a reusable image viewer/modal.

Prefer creating/updating a shared image-preview component and use it everywhere appropriate.

Audit all existing eye/view-image interactions across:

* Floorplates
* Floorplans
* Units
* Amenities
* any other image-preview screen

Do not add upload/edit functionality as part of this task.

---

# ISSUE 6 — Hide "In Stops List" badge when Self-Guided Tour is disabled

On the Amenities listing, each amenity card can contain status chips such as:

```text
No type
Plotted
In Stops List
```

Reference image:

`image6.png`

### Required behavior

For properties where **Self-Guided Tour is not enabled**:

**Do not display the `In Stops List` badge.**

This must be based on the actual DB/configuration status for the property/product capability.

Do not simply hide the badge globally.

For properties where Self-Guided Tour is enabled:

* Preserve the existing `In Stops List` behavior.
* Show the badge when the amenity is actually in the stops list.

The UI must therefore correctly support both states:

```text
Self-Guided Tour disabled
→ No "In Stops List" badge

Self-Guided Tour enabled
→ Existing stops-list status behavior
```

Trace the current source of truth used by the Products/property configuration rather than introducing a second independent flag.

---

# ISSUE 7 — Remove Unit image upload icon

On the Units listing, each card currently has:

* Eye icon
* Upload icon

Reference:

`image11.png`

### Required behavior

Remove the **upload icon** from Unit cards.

Keep only:

**Eye / View Image**

Reason:

Unit images are inherited from Floorplans and are not unit-specific uploads.

Therefore the Units tab should not expose an upload action.

Do not modify Floorplan image behavior.

Do not remove the image viewer.

Do not add a replacement upload workflow.

Also verify there is no empty spacing left where the upload action was removed.

---

# ISSUE 8 — Pagination size + true server/page-by-page Unit loading

This is a **high-priority performance issue**.

## 8A. Pagination size selector

All paginated listings should allow the user to change the number of records displayed per page.

Default:

```text
25
```

Maximum:

```text
100
```

Example:

```text
Rows per page
25
50
75
100
```

Use the existing pagination design where possible.

### Required behavior

When the page size changes:

* update the pagination state;
* reload/fetch the correct page data;
* recalculate the total page count;
* display the correct records;
* reset to page 1 when appropriate;
* do not retain stale records from the previous page size.

Apply this consistently to **all relevant paginated listings**, not only Units.

---

## 8B. CRITICAL — Units must NOT load all records upfront

Current problem:

When opening the Units tab, it takes a long time and eventually shows approximately 300 units.

This indicates that the application is loading all unit records upfront instead of loading the current page only.

### Required architecture

The Units listing must use **true paginated data loading**.

For example:

```text
Open Units
→ fetch page 1 only

Click page 2
→ fetch page 2

Click page 3
→ fetch page 3
```

Do NOT do:

```text
Open Units
→ fetch all 300 units
→ paginate them in the browser
```

### Requirements

* Initial request returns only the current page.
* Next page requests only the next page.
* Previous page requests only the previous page.
* Changing page size requests the new page size.
* Search/filter changes request the appropriate paginated result.
* Do not preload all Units into the browser.
* Do not fetch all Units through a parent/property request.
* Do not create a hidden "load all units" request to calculate pagination.

Trace the full data flow to identify where all units are currently being fetched.

Check:

* parent/layout fetching;
* Property Detail fetching;
* Inventory fetching;
* React Query/SWR caches;
* server components;
* API controllers;
* serializers;
* prefetching;
* client-side pagination.

Fix the root cause.

### Verification

Use browser Network/DevTools to verify:

Opening Units with page size 25 should fetch approximately the requested page, **not all 300+ units**.

Then clicking page 2 should trigger the appropriate page-2 request.

The browser should never receive the entire Unit dataset merely to render pagination.

---

# ISSUE 9 — Companies listing filters + clickable property count

## 9A. Add filters to Companies

The Companies listing currently has no useful filtering controls.

Add appropriate filters based on the actual Company data and existing application patterns.

First inspect the available Company fields and existing Properties/Inventory filter components.

Filters should be genuinely useful for the data, not arbitrary UI.

Potential examples only where supported by actual data:

* company name/search;
* company type;
* status;
* provider;
* property count/range;
* other meaningful existing attributes.

Do not invent filters for fields that do not exist.

Use the actual DB data.

---

## 9B. Company property count must be clickable

The property-count number in each Company row/card should be clickable.

Example:

```text
Company A
42
```

Clicking `42` should navigate to the **Properties listing** with the Company filter already applied.

Expected flow:

```text
Companies
→ click property count for Company A
→ Properties
→ Company filter = Company A
→ only properties belonging to Company A displayed
```

### Requirements

* Apply the correct company filter automatically.
* Preserve the selected company in the URL/query state where the existing architecture supports it.
* Properties page must load filtered data from the backend/API rather than filtering an unrelated full dataset in the browser.
* The user must be able to clear the filter normally.
* Back navigation should behave correctly.

Do not hardcode company IDs.

---

# ISSUE 10 — Property Detail Products must show actual DB state

Property Detail currently contains:

```text
Products

Pynwheel Touch
228 units · 6 floorplates

Self-Guided Tour
10 tour stops

Pynwheel Maps
Enabled
```

This must become **fully data-driven**.

## 10A. Product card must reflect actual DB state

For each property, display the actual state of:

### Pynwheel Touch

Show whether it is enabled/available according to the existing DB/configuration.

Where applicable, show actual:

* unit count;
* floorplate count.

Do not hardcode:

```text
228 units
6 floorplates
```

Calculate/read them from the actual existing data source.

### Self-Guided Tour

Show actual enabled/disabled state.

If enabled, show the actual tour-stop count from DB data.

If disabled, do not display a misleading active state or count.

### Pynwheel Maps

Show the actual DB/configuration state:

```text
Enabled
```

or the appropriate disabled state.

---

## 10B. Product settings are display-only

For this new UI:

**Do not allow the user to update these settings.**

The Products card is for displaying the actual current configuration.

No:

* toggles that persist changes;
* update buttons;
* mutation requests;
* settings-edit workflow.

The values should be read-only.

---

## 10C. Property listing Products column must match the same real state

The Properties listing has a **Products** column.

Make sure its product indicators also come from the actual DB/configuration.

The Property Detail Products card and Properties listing should not disagree.

Use a shared data mapping/serialization model where possible so the same source of truth drives both views.

---

# ISSUE 11 — Self-Guided Tour capability must control Plotting/Wayfinding availability

For companies/properties where **Self-Guided Tour is enabled**, make sure:

**Plotting and Wayfinding are available and functional for those properties.**

This must be data-driven.

Do not hardcode a specific company/property.

For Self-Guided Tour-enabled properties:

* Map & Plotting should be available;
* Wayfinding should be available;
* relevant stops should be available;
* elevator/stairs connections should work where supported;
* Plotting/Wayfinding should use that property's actual DB data.

For properties where Self-Guided Tour is not enabled, do not falsely present Self-Guided Tour-specific state as enabled.

Trace the existing product/capability configuration and use that as the source of truth.

---

# CROSS-FEATURE CONSISTENCY CHECK

After implementing all issues, verify consistency between:

```text
Companies
↓
Properties
↓
Property Detail
↓
Inventory
↓
Amenities
↓
Map & Plotting
↓
Wayfinding
```

Especially verify that the following all represent the same underlying property configuration:

* Self-Guided Tour enabled/disabled
* Pynwheel Touch status
* Pynwheel Maps status
* unit count
* floorplate count
* tour stop count
* Plotting availability
* Wayfinding availability

There must not be conflicting states between listing and detail pages.

---

# TESTING REQUIREMENTS

Test with real records, especially:

```text
John Demo
Property 1411
Map & Plotting
```

Also test at least:

* a property with one building;
* a property with multiple buildings;
* a property with Self-Guided Tour enabled;
* a property with Self-Guided Tour disabled;
* a property with many Units;
* a property with multiple pages of Units;
* a property with image previews.

For each issue verify both the normal state and the relevant edge case.

## Performance verification

For Units specifically:

1. Open Units.
2. Inspect Network requests.
3. Confirm only the requested page is loaded.
4. Change page.
5. Confirm only the new page is fetched.
6. Change page size.
7. Confirm the new page size is fetched.
8. Apply search/filter.
9. Confirm results remain paginated.

Do not consider this issue fixed merely because the UI shows "25 per page"; verify the network/data flow.

---

# DOCUMENTATION

After completing the fixes, append dated updates to:

* `/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md`
* `/Users/zubairzulifqar/pynwheel-staging/context.md`

Update the relevant feature/gap documents with the actual issues resolved.

Do not overwrite previous progress/history.

---

# FINAL VERIFICATION

Before declaring the work complete, verify:

* no console errors introduced;
* no obvious React warnings;
* no broken navigation;
* no stale map overlays;
* no permanent unit/amenity labels on the map;
* hover details work;
* dropdowns do not close through hover gaps;
* markers are hidden during map loading;
* single-building layouts hide the unnecessary Building selector;
* Wayfinding text wraps without moving the action/delete icon;
* all image viewers support zoom/reset;
* Amenities hide `In Stops List` when Self-Guided Tour is disabled;
* Unit upload icon is removed;
* pagination size works from 25 through 100;
* Units are truly fetched page-by-page;
* Companies have appropriate filters;
* company property counts link to filtered Properties;
* Property Products reflect actual DB state;
* Properties Products column matches Property Detail;
* Self-Guided Tour-enabled properties expose Plotting/Wayfinding correctly;
* no unrelated functionality has regressed.

Do not claim an issue is fixed unless it has actually been tested with real data.

At the end, provide a concise report:

```text
Issue 1 — Map labels/hover: PASS/FAIL
Issue 2 — Dropdown hover gap: PASS/FAIL
Issue 3 — Loading markers: PASS/FAIL
Issue 4 — Building/Wayfinding layout: PASS/FAIL
Issue 5 — Image zoom controls: PASS/FAIL
Issue 6 — Amenity stop badge: PASS/FAIL
Issue 7 — Unit upload icon: PASS/FAIL
Issue 8 — Pagination + Unit lazy loading: PASS/FAIL
Issue 9 — Companies filters/property count: PASS/FAIL
Issue 10 — Product DB state: PASS/FAIL
Issue 11 — Self-Tour Plotting/Wayfinding: PASS/FAIL

Tests performed:
...

Known remaining issues:
...
```
