We need to continue improving the current **Pynwheel Connect Next.js UI**. This task is focused on fixing several existing UI issues and then performing a **deep real-data validation and regression pass** across the affected flows.

The work must be done systematically. Do not patch symptoms without first tracing the existing implementation and the old Rails/HTML behavior.

---

# 1. PRIMARY OBJECTIVES

Fix and fully verify these areas:

1. **Amenity images**
2. **Amenity image viewer**
3. **Global loading state**
4. **Map & Plotting floor navigation**
5. **Hydration mismatch**
6. **Real-data validation using the Hazel property**
7. **Old-system flow/case discovery**
8. **UI test coverage**
9. **Pixel-perfect / usability review**
10. **Regression verification across existing Next.js modules**

---

# 2. IMPORTANT PROJECT CONTEXT

Current Next.js application:

```text
/Users/zubairzulifqar/pynwheel-staging/pyn-connect-web
```

Reference UI files:

```text
/Users/zubairzulifqar/Downloads/pyn-system-plotting.html

/Users/zubairzulifqar/pynwheel-staging/pyn-connect-amenties.html

/Users/zubairzulifqar/pynwheel-staging/pyn-connect-22-sep-new.html
```

Old UI:

```text
/Users/zubairzulifqar/pynwheel-staging/pyn-connect-new.html
```

Architecture:

```text
/Users/zubairzulifqar/pynwheel-staging/react-architecture.md

/Users/zubairzulifqar/pynwheel-staging/data-serialization-architecture.md
```

Documentation:

```text
/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/feature_inventory_page.md

/Users/zubairzulifqar/pynwheel-staging/properties_detail_feature.md
```

Also inspect the relevant gaps files already present in the project.

---

# 3. FIRST — DO NOT START PATCHING

Before changing code:

1. Read the relevant documentation.
2. Inspect the current implementation.
3. Reproduce each issue.
4. Trace the current data flow.
5. Trace the old Rails/HTML implementation.
6. Identify the root cause.
7. Only then implement the fix.

Create a short issue/root-cause checklist before coding:

| Issue | Current Behavior | Old System Behavior | Root Cause | Fix | Test |
| ----- | ---------------- | ------------------- | ---------- | --- | ---- |

Do not immediately jump to CSS or conditional fixes without understanding the data/source problem.

---

# 4. AMENITY IMAGES — FIX THE REAL DATA FLOW

Current problem:

When opening **Edit** from the Amenities listing, images are not loading.

The new UI currently shows:

```text
Image unavailable

Lead
Chef Kitchen

Image unavailable

Work Space

Image unavailable

Package Lockers
```

But in the old system, the corresponding amenity images load correctly.

There is also a problem when clicking the eye/image action from the Amenities page.

The new UI shows:

```text
This image could not be loaded.

Fitness Centre — Photo 1 · Cardio equipment

2 of 3

This image could not be loaded.
```

---

# 5. TRACE WHY IMAGES FAIL

Do not simply replace the broken image URL.

Trace the complete image flow:

```text
Old Rails Controller
→ Model
→ Attachment/Image association
→ Image URL/path generation
→ Browser

versus

Next.js
→ Controller JSON
→ Serialization
→ Parser
→ React component
→ Image URL
→ Browser
```

Determine exactly where the problem occurs.

Investigate:

* attachment/image model
* image association
* ActiveStorage or existing storage mechanism
* existing image URL helpers
* host/domain handling
* relative vs absolute URLs
* signed URLs
* image transformations
* authentication requirements
* CORS
* proxy behavior
* JSON serialization
* frontend parser
* image component
* modal/lightbox

Do not guess.

---

# 6. BACKEND RULE FOR IMAGE FIXES

We may make a **minimal Rails controller/data-response change** only if necessary to expose the existing image information correctly as JSON.

Allowed:

* add missing image data to an existing JSON response
* expose existing image URLs
* expose existing image associations
* return frontend-friendly image metadata
* use existing Rails image/storage helpers

Not allowed:

* changing image business logic
* changing storage architecture
* moving files
* changing DB schema
* adding migrations
* changing existing image behavior
* redesigning the backend
* creating unrelated APIs

The backend remains the source of truth.

---

# 7. AMENITY EDIT SCREEN

When opening an Amenity from the listing using **Edit**:

* all existing images should load where the old system has them
* correct number of images should be shown
* correct image order should be preserved where the old system defines one
* thumbnails/previews should work
* primary/secondary image state should be correct
* empty state should only appear when the DB truly has no image

Do not use placeholder/demo images.

Verify against the old system.

---

# 8. AMENITY EYE / IMAGE VIEWER

When clicking the image eye/view icon:

* open the correct image viewer
* load the actual DB-backed image
* show the correct image title/metadata
* display image count correctly
* support previous/next navigation if the current UI/reference provides it
* support close
* handle missing images properly
* show a proper loading state while the image is loading
* only show "This image could not be loaded" when the real image request genuinely fails

Test with real amenities that have:

* one image
* multiple images
* no images

---

# 9. DO NOT MASK IMAGE ERRORS

Do not solve the issue by simply replacing failures with:

```text
Image unavailable
```

The goal is to fix the underlying image data flow.

Use browser DevTools to inspect:

* actual image request
* response status
* URL
* redirect
* response headers
* authentication
* failed network requests

Fix the root cause in the appropriate layer.

---

# 10. GLOBAL LOADING INDICATOR

The old system has a loading animation:

> a cat playing with Pynwheel

We want the same concept in the new UI.

First locate the **actual existing GIF/asset used by the old system**.

Do not recreate or replace it with a random spinner.

Use the original asset where possible.

---

# 11. MODERNIZE THE LOADING GIF PRESENTATION

Use the existing cat/Pynwheel GIF but present it in a way that fits the new UI:

* smaller
* brighter/cleaner presentation
* modern spacing
* visually consistent with the new theme
* unobtrusive
* centered appropriately
* accessible

Do not alter the actual source asset unless there is a compelling reason.

---

# 12. APPLY LOADING STATE GLOBALLY

Add the loading indicator everywhere loading occurs in the relevant Next.js application.

At minimum cover:

* initial page loading
* Property Detail loading
* Inventory loading
* Floorplates loading
* Floorplans loading
* Units loading
* Amenities loading
* Map & Plotting loading
* Tour Setup loading
* image loading where appropriate
* modal data loading
* lazy-loaded content where a visible loading state exists

First determine whether the project already has a shared loading component.

If one exists:

**reuse it.**

If one does not exist:

create one shared reusable loading component.

Do not create individual inconsistent spinners for every page.

---

# 13. LOADING UX REQUIREMENTS

The loading state must:

* appear only when actual loading is happening
* disappear when loading completes
* not flash unnecessarily
* not cause layout jumping where avoidable
* work during navigation
* work during modal/image loading
* work on slow network simulation
* handle errors correctly

Do not hide errors behind an infinite loading state.

---

# 14. MAP & PLOTTING — FLOOR NAVIGATION BUG

Current issue:

The Map & Plotting floor list currently grows **vertically**.

This is not what we want.

The intended design is a **horizontal floorplate navigation strip**.

Reference:

```text
Single floor
Floor 1
Done

Single floor
Floor 2
Done

Single floor
Floor 3
Done

...

Single floor
Floor 31
Done

31 floorplates

Add Floorplate
```

---

# 15. REQUIRED FLOOR NAVIGATION DESIGN

The floorplate list must:

* grow horizontally
* remain a single horizontal navigation area
* not create a very tall vertical page section
* support many floorplates
* support horizontal scrolling/navigation
* keep the **Add Floorplate** control adjacent to the floorplate navigation
* maintain the current UI styling
* remain usable with 19, 31, or more floorplates

The intended visual relationship is:

```text
[ Floor 1 ] [ Floor 2 ] [ Floor 3 ] ... [ Floor N ] [ Add Floorplate ]
```

Do not render all floor cards in a vertical stack.

---

# 16. FORWARD / BACKWARD BUTTONS

The forward and backward navigation buttons in Map & Plotting currently do not work.

Fix them.

They must:

* move the horizontal floorplate strip
* reveal additional floorplates
* work repeatedly
* disable appropriately at the beginning/end
* preserve selected floor
* not reload the entire page unnecessarily
* work with many floorplates

Test with:

* 3 floors
* 19 floorplates
* 31 floorplates
* selected floor near beginning
* selected floor near middle
* selected floor near end

---

# 17. FLOOR NAVIGATION MUST USE REAL DATA

Do not hard-code:

* 31 floors
* floor numbers
* Done status
* plot counts
* No SVG states

Load them from real DB-backed data.

Each floor card should correctly show:

* floor name/number
* floor type
* plotted/total count
* SVG state
* selected state

---

# 18. FLOOR NAVIGATION + ADD FLOORPLATE

The **Add Floorplate** control should remain adjacent to the horizontal floorplate strip.

Reuse the existing Add Floorplate modal.

Do not duplicate the modal implementation.

Save remains UI-only unless the existing requirements explicitly change:

```text
Open modal
→ interact
→ Save
→ close modal
→ no DB mutation
```

---

# Tour Setup → Tour Stop Actions / Modals: 

# EDIT TOUR STOP MODAL

Implement the **Edit Tour Stop** modal exactly as shown in:

`/Users/zubairzulifqar/Downloads/pyn-system-plotting.html`

Reference structure:

```text
Edit Tour Stop

Elevators · Elevator · 1 · Floor 1

Dwell time (min)
Kept on this page only; the CMS stores no dwell time.

AI Concierge Talking Point
The CMS stores this as the stop’s directional text (a unit’s stop description).

Nothing is saved to the CMS; the change lives on this page.

Cancel
Save Changes
```

## Important UI requirements

The modal must match the reference UI as closely as possible, including:

* title
* stop/type/building/floor information
* Dwell time field
* AI Concierge Talking Point field
* helper text
* explanatory/read-only messaging
* spacing
* typography
* borders
* buttons
* modal dimensions
* alignment
* responsive behavior

### Button layout

**`Cancel` and `Save Changes` MUST appear side-by-side horizontally**, exactly as shown in:

`pyn-system-plotting.html`

They must **NOT be stacked vertically**.

Expected layout:

```text
[ Cancel ]   [ Save Changes ]
```

Do not allow the buttons to wrap into:

```text
[ Cancel ]

[ Save Changes ]
```

unless the viewport genuinely requires a responsive mobile layout.

## Read-only behavior

This modal is UI-only.

When the user clicks:

### Cancel

Close the modal and discard local changes.

### Save Changes

Apply the changes only to local React state/page state as appropriate, then close the modal.

Do NOT:

* send POST
* send PUT
* send PATCH
* send DELETE
* update the CMS
* update the database
* call a persistence endpoint

The UI must behave naturally, but the database must remain unchanged.

## Data mapping

Where the selected Tour Stop has existing backend data:

* load the real stop information
* populate the modal with the actual stop
* populate the existing directional text where available
* use the actual building/floor/type information

Do not hard-code:

```text
Elevators
Elevator
1
Floor 1
```

Those are reference values only.

## Validation

Implement the UI-side validation shown/required by the reference.

Validation must happen entirely in the frontend.

Invalid input must not result in a backend request.

## Testing

Verify:

1. Edit opens the correct Tour Stop.
2. Real stop data is displayed.
3. Dwell time field works locally.
4. AI Concierge Talking Point works locally.
5. Cancel closes and discards changes.
6. Save Changes closes/applies local changes only.
7. No backend mutation request is sent.
8. Buttons remain horizontally aligned as in the reference UI.
9. Modal matches the reference in desktop and supported responsive layouts.

# 19. MAP CANVAS REGRESSION

After fixing the floor navigation, verify that selecting a floor still correctly loads:

* floor SVG
* polygons
* plotted units
* amenities
* paths
* nodes
* selected state
* floor-specific data

Do not fix navigation at the expense of canvas behavior.

---

# 20. HYDRATION ERROR

There is currently this error:

```text
A tree hydrated but some attributes of the server rendered HTML
didn't match the client properties.

<body cz-shortcut-listen="true">
```

with the stack pointing to:

```text
src/app/layout.tsx
```

Investigate this properly.

Do NOT simply suppress the hydration warning.

Do NOT add `suppressHydrationWarning` unless it is genuinely justified after identifying the root cause.

---

# 21. HYDRATION INVESTIGATION

Determine whether this particular mismatch is:

* caused by a browser extension
* caused by application code
* caused by SSR/client branching
* caused by Date/Time
* caused by random values
* caused by generated IDs
* caused by browser-only values
* caused by inconsistent server/client rendering

The shown:

```text
cz-shortcut-listen="true"
```

may come from a browser extension.

Test the application in:

1. normal browser
2. incognito/private browser
3. extensions disabled where practical

Do not assume the extension is the only issue.

Inspect `layout.tsx` and the relevant client/server components.

---

# 22. HYDRATION FIX REQUIREMENT

If it is an application issue:

fix the real source of the mismatch.

If it is entirely caused by an external browser extension:

* do not modify application code merely to accommodate the extension
* verify that the application hydrates correctly in a clean environment
* document the finding

The final report must clearly distinguish:

**application hydration issue**

from:

**browser-extension-induced warning**

---

# 23. HAZEL PROPERTY — PRIMARY REAL-DATA TEST PROPERTY

Use the **Hazel property** from the current database as the primary real-data QA target.

Find the actual Hazel property record in the existing environment.

Do not create demo data.

Do not copy prototype data.

Use the actual database record.

---

# 24. DEEP HAZEL PROPERTY VALIDATION

Run a complete end-to-end test using Hazel.

Verify:

### Property

* Property Detail
* identity
* address
* contacts
* manager information
* settings

### Inventory

* floorplates
* floorplans
* units
* amenities

### Amenities

* amenity records
* types
* buildings
* floors
* lock providers
* videos
* descriptions
* directional text
* image counts
* actual images

### Map & Plotting

* buildings
* floors
* floorplates
* SVG
* polygons
* unit plots
* amenity plots
* nodes
* paths
* vertical relationships

### Tour Setup

* tour stops
* plotted state
* nodes
* routing-related data
* elevators/locks if present

---

# 25. DO NOT USE ONE HAPPY PATH

We need to test real-world UI states.

Identify all relevant cases from the old system.

Inspect the old Rails/HTML implementation and build a test matrix covering cases such as:

### Images

* no image
* one image
* multiple images
* broken/missing asset
* slow image
* image viewer
* next/previous image
* close viewer

### Floorplates

* SVG exists
* SVG missing
* plotted items
* no plotted items
* partial plotting
* many floorplates
* selected first floor
* selected middle floor
* selected last floor

### Units

* plotted
* not plotted
* available
* other statuses
* missing provider ID
* manual values
* feed values

### Amenities

* image
* no image
* video
* no video
* plotted
* not plotted
* hidden from stops
* in stops
* lock provider
* no lock provider

### Modals

* open
* close
* validation
* save
* cancel
* empty state
* no-op/read-only behavior

### Navigation

* forward
* backward
* direct selection
* switching pages
* back navigation
* deep links

Build the actual test matrix from the old system, not only from this list.

---

# 26. OLD SYSTEM FLOW DISCOVERY

Use the old Rails/HTML application to identify the actual user flows.

Trace and document:

```text
Properties
→ Property Detail
→ Inventory
→ Amenities
→ Map & Plotting
→ Tour Setup
```

Also inspect the relevant old menus/routes for:

* Amenity management
* Amenity images
* Property Map
* Auto Wayfinding
* Tour Stops
* Elevators
* Routing
* Floorplates
* Floorplans
* Units

For every flow determine:

* entry point
* controller/action
* data loaded
* user interaction
* modal
* state
* error case
* empty case
* navigation

---

# 27. WRITE PROPER UI TEST CASES

Inspect the existing test setup in the Next.js project.

If the project already has:

* Playwright
* Cypress
* Jest
* React Testing Library
* another established UI testing approach

use the existing approach.

Do not introduce a second test framework unnecessarily.

Write test cases for the affected functionality.

Tests should cover at least:

### Amenities

* listing loads
* filters
* search
* amenity card
* edit
* images
* image viewer
* video state
* empty image state

### Map & Plotting

* page loads
* building selection
* floor selection
* horizontal navigation
* forward button
* backward button
* first/last boundary
* SVG loading
* canvas
* real plotted objects
* local plotting
* existing paths

### Tour Setup

* page loads
* stops
* plotted state
* View on Plan
* Plot on Plan
* routing
* elevators/locks

### Loading

* page loading state
* data loading
* image loading
* slow loading
* error state

### Navigation

* Properties → Property Detail
* Property Detail → Inventory
* Inventory → Amenities
* Inventory → Map & Plotting
* Inventory → Tour Setup
* Map & Plotting ↔ Tour Setup

---

# 28. TEST REAL DATA, NOT ONLY MOCK DATA

The tests should distinguish between:

* component/UI tests
* integration tests
* real-data/manual validation

Where the environment supports it, use actual Hazel data for integration/manual validation.

Do not change production/staging data during tests.

---

# 29. READ-ONLY RULE REMAINS

The UI may perform local interactions:

* plotting
* moving
* junctions
* connections
* Auto Plot previews
* filters
* modals
* temporary state

But persistent DB state must remain read-only.

Do not enable:

* updates
* deletes
* uploads
* publishing
* syncing
* creating records

unless a requirement explicitly changes later.

---

# 30. NETWORK AUDIT

Use browser DevTools.

For the affected UI flows verify:

### Allowed

* GET/read requests
* image reads
* video reads
* existing JSON data requests

### Not allowed

* POST
* PUT
* PATCH
* DELETE
* upload requests
* sync requests
* publish requests

Test the buttons and modals.

Confirm no accidental writes occur.

---

# 31. PIXEL-PERFECT REVIEW

After functional fixes are complete, compare the UI against:

```text
/Users/zubairzulifqar/Downloads/pyn-system-plotting.html
```

for Map & Plotting and Tour Setup.

Also compare Amenities against:

```text
/Users/zubairzulifqar/pynwheel-staging/pyn-connect-amenties.html
```

Review:

* typography
* spacing
* card size
* borders
* shadows
* icons
* button sizes
* modal size
* image layout
* floor navigation
* horizontal scrolling
* loading state
* alignment
* responsive behavior
* hover/selected states
* empty states

Do not stop at "it works."

---

# 32. USABILITY REVIEW

Check:

* clear selected states
* keyboard/mouse usability where appropriate
* obvious navigation
* horizontal floor navigation usability
* disabled states
* loading feedback
* image error feedback
* empty-state messaging
* modal close behavior
* scroll behavior
* no accidental page jumps
* no confusing fake success messages

---

# 33. PERFORMANCE REVIEW

For the floor navigation and map:

* avoid rendering unnecessary floor cards repeatedly
* avoid unnecessary canvas rerenders
* avoid repeatedly parsing SVG
* avoid repeated image requests
* use memoization where useful
* maintain smooth floor navigation
* maintain responsive interactions

Do not optimize by removing required UI/data.

---

# 34. DOCUMENTATION

After completing the fixes, append new dated entries to:

```text
/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/context.md
```

Do not delete history.

Document:

### Images

* root cause
* backend JSON exposure if any
* image URL structure
* React handling
* viewer behavior

### Loading

* shared loading component
* old GIF asset source
* where global loading was added

### Map & Plotting

* horizontal floor navigation
* forward/back behavior
* floor data source
* canvas changes

### Hydration

* root cause
* whether extension-related or application-related
* actual fix

### Testing

* Hazel property
* test cases
* test results
* remaining issues

---

# 35. UPDATE FEATURE DOCUMENTATION

Update relevant feature documentation, especially:

```text
feature_inventory_page.md
properties_detail_feature.md
```

where applicable.

Keep implementation status accurate.

---

# 36. GAPS

If any problem cannot be solved using:

```text
existing DB data
+
existing Rails behavior
+
minimal JSON exposure
+
frontend implementation
```

document it in the appropriate gaps file.

Do NOT introduce unnecessary backend functionality just to make a UI case pass.

---

# 37. IMPLEMENTATION ORDER

Follow this exact sequence:

```text
PHASE 1
Read documentation and architecture

↓

PHASE 2
Inspect current Amenities implementation

↓

PHASE 3
Inspect current Map & Plotting implementation

↓

PHASE 4
Inspect current Tour Setup implementation

↓

PHASE 5
Reproduce all reported issues

↓

PHASE 6
Trace old Rails/HTML implementation

↓

PHASE 7
Trace image data flow

↓

PHASE 8
Trace floor navigation/data flow

↓

PHASE 9
Trace loading implementation

↓

PHASE 10
Trace hydration issue

↓

PHASE 11
Create issue/root-cause map

↓

PHASE 12
Fix amenity image data flow

↓

PHASE 13
Fix image viewer

↓

PHASE 14
Implement global loading indicator

↓

PHASE 15
Fix hydration issue if application-caused

↓

PHASE 16
Implement horizontal floor navigation

↓

PHASE 17
Fix forward/backward controls

↓

PHASE 18
Verify real map data

↓

PHASE 19
Run Hazel property validation

↓

PHASE 20
Discover old-system test cases

↓

PHASE 21
Write UI/integration tests

↓

PHASE 22
Run tests

↓

PHASE 23
Run pixel-perfect review

↓

PHASE 24
Run usability review

↓

PHASE 25
Run network/write audit

↓

PHASE 26
Run regression tests

↓

PHASE 27
Update documentation

↓

PHASE 28
Review git diff

↓

PHASE 29
Final QA
```

---

# 38. DO NOT PATCH ONLY THE REPORTED EXAMPLES

For images, for example, do not fix only:

```text
Lead
Chef Kitchen
Work Space
Package Lockers
```

Find and fix the underlying image-loading mechanism so that **all existing amenity images** work.

Likewise, do not make the floor navigation work only for 31 floors.

It must work correctly for any number of floorplates.

---

# 39. FINAL GIT REVIEW

Before completion:

```bash
git status
git diff
```

Verify:

* no unrelated changes
* no schema changes
* no migrations
* no business logic changes
* no hard-coded DB records
* minimal controller JSON changes only where required
* no accidental mutation endpoints
* no duplicate components
* existing architecture followed
* tests added/updated
* documentation updated

---

# 40. FINAL REPORT

Return a detailed but structured report:

## A. Issues Investigated

List each reported issue.

## B. Root Causes

Explain the actual root cause of each issue.

## C. Amenity Images

Explain:

* old data source
* JSON changes
* frontend mapping
* actual image URL handling
* image viewer fix

## D. Loading

Explain:

* old GIF asset
* shared component
* where it was added
* states covered

## E. Map & Plotting

Explain:

* horizontal floor navigation
* forward/backward behavior
* floor data
* canvas behavior

## F. Hydration

Explain:

* root cause
* whether it was extension-related
* whether application changes were required

## G. Hazel Testing

Report actual Hazel property validation.

## H. Test Cases

List the test cases created and their results.

## I. Old-System Flows

List the old-system flows discovered and verified.

## J. Components

List:

* reused components
* new components and why

## K. Backend

List controller changes.

Explicitly confirm:

> Backend changes were limited to exposing existing data as JSON where required. No business logic, business rules, schema, validation, authorization, or unrelated backend behavior was changed.

## L. Read-only Audit

Confirm that no UI action caused persistent DB mutation.

## M. Documentation

Confirm updates to:

* `PYN_CONNECT_PROGRESS.md`
* `context.md`
* relevant feature files
* relevant gaps files

## N. Remaining Issues

Only list genuine unresolved issues.

---

# NON-NEGOTIABLE REQUIREMENTS

1. **Fix the underlying image data flow; do not mask broken images with placeholders.**
2. **Use the real old-system image asset for the loading indicator.**
3. **Use one reusable modern loading component throughout the application.**
4. **Make the Map & Plotting floor navigation horizontal, not vertical.**
5. **Make forward/backward navigation actually work.**
6. **Keep Add Floorplate adjacent to the horizontal floor navigation.**
7. **Use real DB data for floorplates, images, units, amenities and map data.**
8. **Use Hazel as the primary real-data validation property.**
9. **Trace and test the actual old-system flows and edge cases.**
10. **Write proper UI tests using the project's existing test framework where possible.**
11. **Investigate the hydration warning instead of suppressing it blindly.**
12. **Follow `react-architecture.md` and `data-serialization-architecture.md`.**
13. **Reuse existing components before creating new ones.**
14. **Only make minimal backend controller changes needed to expose existing data as JSON.**
15. **Do not change backend business logic or database structure.**
16. **All DB state remains strictly read-only from this UI.**
17. **UI-only actions, plotting, validation and temporary state should still work fully in the browser.**
18. **Test real data, not only prototype/demo data.**
19. **Review the final UI for pixel accuracy and usability.**
20. **Update `PYN_CONNECT_PROGRESS.md` and `context.md` with a new dated entry.**

---

# FINAL EXECUTION PRINCIPLE

Follow:

```text
REPRODUCE
→ INVESTIGATE
→ TRACE OLD SYSTEM
→ FIND ROOT CAUSE
→ MAP REAL DATA
→ FIX DATA FLOW
→ IMPLEMENT UI
→ TEST REAL DATA
→ TEST EDGE CASES
→ PIXEL REVIEW
→ USABILITY REVIEW
→ NETWORK AUDIT
→ REGRESSION TEST
→ DOCUMENT
→ FINAL QA
```

**Start with investigation and reproduction of the reported problems. Do not begin by making UI patches. First determine exactly why the old system loads the images correctly, why the Next.js implementation does not, why floor navigation is broken, and whether the hydration warning is application-generated or extension-generated. Then implement the fixes one issue at a time and test each one before moving to the next.**
