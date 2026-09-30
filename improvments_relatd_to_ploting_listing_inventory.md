We need to make the following improvements to the current Pynwheel Connect Next.js implementation.

Work carefully and **step by step**. Do not make changes blindly. First inspect the current implementation, identify the root cause, then implement and test each improvement.

The current branch is:

`feature/properties_inventory_improvments`

Project:

`/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web`

Relevant references:

```text id="0n5h9y"
/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html

/Users/zubairzulifqar/pynwheel-staging/pyn-system-plotting.html

/Users/zubairzulifqar/pynwheel-staging/react-architecture.md

/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/context.md
```

---

# 1. FIRST — INVESTIGATE BEFORE CODING

Do not immediately start modifying code.

First inspect:

- current Companies listing
- current Properties listing
- current Property Detail
- current Inventory page
- current Map & Plotting implementation
- existing data-fetching logic
- controller/API calls
- serialization/parsing
- loading states
- shared components
- sorting/filtering implementations
- route structure

Also inspect the old Rails implementation/controllers where needed to understand where the data originates.

Create a short root-cause/task map first:

| Area | Current Behavior | Root Cause | Required Change | Expected Result |
| ---- | ---------------- | ---------- | --------------- | --------------- |

Then implement one area at a time.

---

# 2. PERFORMANCE — INVENTORY MUST NOT LOAD EVERYTHING UPFRONT

## Current problem

When opening the **John Demo** property and clicking the Inventory icon from the Properties listing, the page takes a long time to open.

The current implementation appears to load the complete dataset upfront:

```text
Floorplates: 6
Floorplans: 7
Units: 294
Amenities: ...
```

The likely issue is that all Inventory datasets are being fetched before the user actually needs them.

## Required behavior

When the user is on the Properties listing:

**DO NOT fetch Inventory datasets in advance.**

Specifically, do not preload:

- Floorplates
- Floorplans
- Units
- Amenities
- Map/plotting-specific data
- Other heavy Inventory-only data

until the user actually opens the corresponding Inventory experience.

The desired flow is:

```text id="p4nuxu"
Properties Listing
        ↓
User clicks Inventory
        ↓
Navigate to Inventory
        ↓
Load required Inventory data
        ↓
Render page
```

NOT:

```text id="lhrjta"
Properties Listing
        ↓
Fetch Floorplates
Fetch Floorplans
Fetch Units
Fetch Amenities
Fetch Map data
Fetch other Inventory data
        ↓
User clicks Inventory
        ↓
Page already has everything
```

---

# 3. INVESTIGATE THE CURRENT PERFORMANCE BOTTLENECK

Determine exactly why Inventory data is currently being fetched too early.

Inspect for:

- parent-level data fetching
- layout-level data fetching
- server component fetching
- client component `useEffect`
- prefetching
- route preloading
- React Query/SWR configuration
- shared context/provider loading Inventory
- Property Detail loading Inventory unnecessarily
- API calls triggered by rendering hidden tabs
- eager fetching of all Inventory sections
- duplicate requests
- repeated requests
- unnecessary data serialization
- oversized JSON responses

Do not assume the issue is only "too much data".

Measure the actual request behavior.

---

# 4. PERFORMANCE TARGET

Opening the Properties listing should load only the data necessary for the Properties page.

Opening Property Detail should load only Property Detail data required for that page.

Opening Inventory should then load Inventory-specific data.

Within Inventory, avoid loading expensive sections unnecessarily if the UI allows lazy loading.

For example, consider:

```text id="9y4zot"
Inventory
├── Summary
├── Floorplates
├── Floorplans
├── Units
└── Amenities
```

Determine whether these can be loaded:

- on demand
- when their section/tab becomes active
- through separate existing read endpoints
- or through appropriately scoped responses

Do not introduce complexity unless it materially improves performance.

---

# 5. DO NOT BREAK REAL DATA

Performance optimization must not result in:

- missing data
- stale data
- mock data
- incorrect counts
- incorrect relationships
- duplicate requests
- race conditions

Continue using the existing DB/backend as the source of truth.

The goal is:

> **Load the same correct data, but only when it is actually needed.**

---

# 6. MEASURE BEFORE AND AFTER

Before changing the implementation, inspect the Network tab and document approximately:

- number of requests
- request timing
- large responses
- duplicate requests
- Inventory requests triggered from Properties
- Inventory requests triggered from Property Detail

After the change, compare.

Verify that:

### Properties page

does not fetch Inventory datasets.

### Property Detail

does not unnecessarily fetch full Inventory datasets.

### Inventory

fetches the required datasets when opened.

Document the before/after result in:

`PYN_CONNECT_PROGRESS.md`

---

# 7. LOOK FOR OTHER PERFORMANCE PROBLEMS

While investigating the Inventory issue, identify any other obvious performance problems.

Examples:

- duplicate API requests
- fetching the same dataset multiple times
- fetching all units when only a summary is required
- fetching all images eagerly
- rendering hundreds of cards unnecessarily
- unnecessary re-renders
- repeated SVG parsing
- unnecessary serialization
- loading hidden sections
- fetching data that is never displayed

Do not make speculative optimizations.

Only fix issues you can demonstrate or reasonably verify.

At the end, provide a short section:

**Additional performance issues found**

and distinguish:

- fixed
- deferred
- not an actual issue

---

# 8. SORTING — COMPANIES

Add sorting to all feasible sortable columns in the Companies listing.

Use the existing Companies data structure.

For each sortable column:

1. User clicks the column header.
2. First click → ascending.
3. Second click → descending.
4. Third click → default/unsorted.
5. Clicking another sortable column should make that the active sort.

The active column header should display the sorting icon/state.

Use the project's existing icon/component conventions.

---

# 9. SORTING — PROPERTIES

Implement the same behavior for all feasible sortable columns in Properties.

Cycle:

```text id="cyg9ve"
Default
   ↓
Ascending
   ↓
Descending
   ↓
Default
```

The UI must clearly communicate the current state.

Do not add sorting to columns where sorting does not make semantic sense.

Determine the feasible columns from the current data model/UI.

---

# 10. SORTING REQUIREMENTS

Sorting should operate on the actual displayed data.

Handle correctly:

- strings
- numbers
- counts
- dates where available
- empty/null values

Do not implement alphabetical sorting on numeric fields.

Use a consistent null/empty-value strategy.

Sorting must not mutate the original source dataset.

Prefer reusable sorting logic rather than duplicating it separately in Companies and Properties.

If a shared sorting utility already exists, reuse it.

---

# 11. SORTING ICON UX

The column header should indicate:

### Default

No active sort or neutral indicator.

### Ascending

Ascending sort icon/state.

### Descending

Descending sort icon/state.

### Third click

Return to default state.

The UI should remain consistent across Companies and Properties.

---

# 12. MAP & PLOTTING — UPDATE TO NEW REFERENCE UI

The Map & Plotting implementation must now be aligned with:

`/Users/zubairzulifqar/pynwheel-staging/pyn-system-plotting.html`

The scope here is specifically the **Map & Plotting UI**.

Do not implement unrelated screens.

The current/reference structure includes:

```text id="o8z4st"
Map & Plotting

Pick a building and floorplate, select units or amenities,
then drop them onto polygons in the floor SVG.

Inventory
Tour Setup

Building

Tower A 19
Tower B 2
```

Then floorplate navigation:

```text id="r7d0ze"
Single floor
Lobby
0/3

Single floor
Floor 2
Done

Single floor
Floor 3
Done

...

Single floor
Floor 15
3/4

...

Single floor
Floor 17
No SVG

...

Named floor
Rooftop
No SVG

19 floorplates

Add Floorplate
```

---

# 13. MAP & PLOTTING — NEW TOP SECTION

The updated UI should contain:

```text id="d08k9x"
A · Floor 4
67 of 67 plotted

Auto Plot
Manual Plot
Off

Grid

Floor SVG
Background image

Publish
```

Follow the exact reference structure and styling in:

`pyn-system-plotting.html`

---

# 14. PATHWAYS & PINS TOOLBAR

Implement:

```text id="y8owr4"
Pathways & pins

Select
Place Pin
Junction
Connect
Move
Start Plotting Hallways
```

Also include:

> Click a polygon to see what sits on it, or a pin or node to select it

Use the actual existing map data.

---

# 15. FLOOR INFORMATION PANEL

Implement:

```text id="qj9e9s"
A · Floor 4

Floor SVG + background

1785636800-optimized.svg
+
1773860750-SVG_FL4.png

67 pins
0 nodes on this floor

Upload SVG
Upload Image
Drop target

Floor SVG
Background
Remove Plan
```

Do not hard-code:

- file names
- pin count
- node count
- floor
- building

Load them from the real DB/backend data.

---

# 16. MAP CANVAS

The map canvas remains the highest-priority part of Map & Plotting.

It must render the actual selected floor's:

- SVG
- background image
- polygons
- unit pins
- amenity pins
- nodes
- paths
- existing plotted state
- selected state

Use real DB-backed data.

Do not use prototype coordinates.

---

# 17. MAP DATA LOADING

Do not load the entire property's map/inventory dataset unnecessarily before Map & Plotting is opened.

Once Map & Plotting is opened:

- load the required map/floor data
- load the required units/amenities for the selected property
- load only what is needed for the selected floor where possible
- reuse existing controllers and data sources

Do not introduce unnecessary backend changes.

---

# 18. MAP FLOOR NAVIGATION

The floor list must remain horizontal.

Do NOT allow 19/31 floorplates to create a huge vertical list.

Use a horizontal strip with:

- previous button
- visible floor cards
- next button
- Add Floorplate

Example:

```text id="5q4h0n"
< [Floor 1] [Floor 2] [Floor 3] [Floor 4] [Floor 5] ... [Floor N] > [Add Floorplate]
```

Previous/next must actually work.

Test:

- first floor
- middle floor
- last floor
- many floorplates
- selected floor after horizontal movement

---

# 19. FLOOR COMPLETION STATE

Show real completion status:

```text id="ck6cmy"
0/3
Done
3/4
2/3
2/4
10/11
No SVG
```

Calculate from actual backend data.

Do not hard-code values.

---

# 20. PROPERTY / FLOOR DYNAMIC DATA

The selected:

- property
- building
- floorplate
- floor

must remain dynamic.

Do not hard-code prototype IDs or values.

---

# 21. PRESERVE EXISTING READ-ONLY RULE

The DB remains strictly read-only.

We can implement UI interactions such as:

- Auto Plot
- Manual Plot
- Select
- Place Pin
- Junction
- Connect
- Move
- Grid
- Start Plotting Hallways
- local path creation
- temporary state

but these must not persist changes.

No mutation requests should be sent.

---

# 22. BACKEND CHANGES

You may make minimal controller changes only when required to expose existing data as JSON.

Allowed:

- `format.json`
- JSON response
- existing associations in JSON
- frontend-friendly response shape
- existing data serialization

Not allowed:

- business logic changes
- database schema changes
- migrations
- new business rules
- new persistence behavior
- unrelated backend modifications

The backend should continue to provide the same underlying data and behavior.

---

# 23. SERIALIZATION ARCHITECTURE

Continue following:

`react-architecture.md`

and:

`data-serialization-architecture.md`

Use the same serialization/parsing architecture already used by:

- Companies
- Properties
- Property Detail
- Inventory
- Amenities
- Map & Plotting

Do not create an isolated data pattern.

---

# 24. REUSE EXISTING COMPONENTS

Before creating anything new, search for:

- floorplate cards
- floor navigation
- map/canvas
- SVG renderer
- buttons
- icons
- modals
- image viewer
- sorting controls
- loading
- filters
- cards
- tabs

Reuse existing components whenever reasonably possible.

Only create new components when necessary.

---

# 25. TESTING — USE REAL DATA

Use the existing real environment and the **John Demo** property for the Inventory performance test.

Also use the **Hazel property** for deep data/UI validation where applicable.

Test:

### Performance

- Properties listing
- Property Detail
- Inventory navigation
- initial Inventory load
- Floorplates
- Floorplans
- Units
- Amenities

### Sorting

- Companies
- Properties
- ascending
- descending
- reset
- null values
- numeric fields
- multiple columns

### Map & Plotting

- building selection
- floor selection
- horizontal floor navigation
- previous
- next
- floor completion state
- SVG
- background
- polygons
- pins
- nodes
- paths
- local plotting
- Grid
- Auto Plot
- Manual Plot

---

# 26. ADD PROPER TEST CASES

Use the project's existing test framework.

Do not introduce another framework unless necessary.

Add tests for:

## Performance/data loading

Verify that Inventory data is not requested while only the Properties listing is open.

Verify Inventory data is requested once Inventory is opened.

Verify duplicate requests are avoided where possible.

## Sorting

For Companies:

- ascending
- descending
- default
- switching columns

For Properties:

- ascending
- descending
- default
- switching columns

## Map Navigation

- first floor
- next
- previous
- last floor
- many floorplates
- selected floor persistence

## Real Data

Verify that real DB-backed data is displayed correctly.

---

# 27. TEST THE UI AGAINST OLD SYSTEM FLOWS

Where the labels and functionality correspond to the old system:

Trace the old Rails flow and make sure the new UI represents the same underlying information correctly.

Do not copy old styling.

Use:

- old system → data/behavior reference
- new HTML → UI/visual reference

---

# 28. LOADING STATES

Use the shared loading component already implemented for the application.

Do not introduce another spinner.

Make sure loading appears during:

- Inventory data loading
- Map data loading
- Floor switching where data is loaded
- image loading
- other genuinely asynchronous states

Do not show loading when no request is occurring.

---

# 29. ERROR HANDLING

Make sure performance optimizations do not hide errors.

Handle:

- failed API request
- empty data
- missing SVG
- missing background
- missing image
- invalid floor
- invalid property
- failed JSON parsing

using the application's existing error/empty-state conventions.

---

# 30. DOCUMENTATION

After implementation, append dated updates to:

```text id="a18ry1"
/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/context.md
```

Also update relevant feature documentation:

```text id="x3khjt"
/Users/zubairzulifqar/pynwheel-staging/feature_inventory_page.md

/Users/zubairzulifqar/pynwheel-staging/properties_detail_feature.md
```

Document:

### Performance

- root cause
- before/after loading behavior
- requests removed/deferred
- duplicate requests fixed

### Sorting

- sortable columns
- state cycle
- shared implementation

### Map & Plotting

- updated UI
- floor navigation
- canvas/data changes
- JSON changes
- real-data validation

---

# 31. GAPS

If any functionality cannot be implemented using:

```text id="34y6lm"
existing DB data
+
existing Rails logic
+
minimal JSON exposure
+
frontend implementation
```

document it in the appropriate gaps file instead of expanding backend scope.

Do not implement unnecessary backend functionality.

---

# 32. BEFORE / AFTER PERFORMANCE VALIDATION

This is mandatory.

Capture/inspect the Network behavior before the optimization.

Then capture/inspect after.

Provide a comparison:

| Metric                          | Before | After |
| ------------------------------- | -----: | ----: |
| Inventory requests before click |        |       |
| Requests after click            |        |       |
| Largest response                |        |       |
| Duplicate requests              |        |       |
| Initial load behavior           |        |       |

Use actual observed values where possible.

Do not invent measurements.

---

# 33. FINAL UI REVIEW

Compare the updated Map & Plotting UI against:

`/Users/zubairzulifqar/pynwheel-staging/pyn-system-plotting.html`

Pay particular attention to:

- floor navigation layout
- horizontal scrolling
- previous/next controls
- Add Floorplate position
- header
- toolbar
- Floor SVG/Background controls
- canvas
- cards
- status states
- spacing
- typography
- icons
- button states

---

# 34. FINAL REGRESSION

Verify:

- Login
- Companies
- Properties
- Property Detail
- Inventory
- Amenities
- Map & Plotting
- Tour Setup

No existing functionality should regress.

---

# 35. FINAL GIT REVIEW

Run:

```bash
git status
git diff
```

Ensure:

- no unrelated changes
- no migrations
- no schema changes
- no business logic changes
- backend changes limited to JSON exposure
- no hard-coded DB data
- no duplicate components
- no duplicate API requests
- tests added/updated
- documentation updated

---

# FINAL IMPLEMENTATION ORDER

Follow this exact sequence:

```text id="wvcc51"
1. Read documentation and architecture
        ↓
2. Inspect current implementation
        ↓
3. Reproduce Inventory performance issue
        ↓
4. Measure current requests
        ↓
5. Trace why Inventory data loads early
        ↓
6. Fix deferred/lazy loading
        ↓
7. Measure again
        ↓
8. Implement Companies sorting
        ↓
9. Implement Properties sorting
        ↓
10. Inspect current Map & Plotting
        ↓
11. Compare against pyn-system-plotting.html
        ↓
12. Update floor navigation
        ↓
13. Fix previous/next
        ↓
14. Update Map & Plotting UI
        ↓
15. Connect real DB data
        ↓
16. Verify canvas
        ↓
17. Add/update tests
        ↓
18. Validate John Demo
        ↓
19. Validate Hazel
        ↓
20. Pixel-perfect review
        ↓
21. Network/performance audit
        ↓
22. Regression testing
        ↓
23. Update documentation
        ↓
24. Git diff review
        ↓
25. Final QA
```

# NON-NEGOTIABLE REQUIREMENTS

1. **Do not load all Floorplates/Floorplans/Units/Amenities before Inventory is opened.**
2. **Find and fix the actual performance bottleneck rather than merely hiding the loading time.**
3. **Measure network behavior before and after the performance change.**
4. **Companies and Properties sorting must support Ascending → Descending → Default.**
5. **Sortable column headers must visibly indicate the active sort direction.**
6. **Map & Plotting must follow the updated `pyn-system-plotting.html` UI.**
7. **Floor navigation must be horizontal, not a tall vertical list.**
8. **Previous/next floor navigation must actually work.**
9. **Use real DB data for all displayed property/floor/map information.**
10. **Do not hard-code prototype data.**
11. **Minimal Rails controller JSON changes are allowed only to expose existing data.**
12. **Do not change backend business logic or DB schema.**
13. **The DB remains strictly read-only from these UI actions.**
14. **Reuse existing React components and serialization architecture.**
15. **Test using real data, especially John Demo for performance and Hazel for deep validation.**
16. **Add proper automated UI/integration tests using the existing test framework.**
17. **Document the implementation and performance findings in `PYN_CONNECT_PROGRESS.md` and `context.md`.**

Start with **investigation and measurement**, especially the John Demo Inventory-loading problem. Do not begin by changing components until you have identified which requests are being made, when they are being made, and why.
