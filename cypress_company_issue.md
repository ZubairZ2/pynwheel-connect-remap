# CRITICAL — PYNWHEEL SVG MAP, DUAL-MAP RENDERING, ASSET DELIVERY & AUTO-DETECT FIX

## Objective

Investigate and resolve the critical map-rendering, asset-loading, plotting, and hallway-detection issues affecting the Pynwheel Connect Next.js application.

**Alliance / Cypress Terra is a priority client. Jennifer Demo FP and John Demo FP are also critical test cases.** The goal is not to implement property-specific workarounds. The goal is to make map rendering and hallway detection reliable across all supported Pynwheel properties, with particular emphasis on SVG maps and properties that use separate background and foreground map assets.

Before changing code, understand the existing project architecture, domain model, historical implementation decisions, and current implementation status. Diagnose the root causes, make the smallest correct changes at the appropriate layer, and verify the fixes against real data.

---

# 1. STRICT DATABASE ACCESS AND SAFETY REQUIREMENTS

The read-only Heroku production database URL is already available locally at:

```text
~/.pynwheel_ro_url
```

Use this connection to inspect the actual production data, investigate asset relationships, run read-only queries, and verify the database-side causes of the reported issues.

The production company and property data must be treated as the source of truth for diagnosis.

## Mandatory restrictions

* The production database connection is strictly read-only.
* Never print, expose, copy into logs, or include the connection URL, password, or credentials in reports.
* Do not run database writes, schema changes, migrations, seeds, destructive commands, or data-cleanup operations against production.
* Do not run auto-detection or plotting operations against production if they can persist changes.
* Do not modify production map assets, S3 objects, floorplates, graph nodes, paths, units, amenities, or other records.
* Do not disable production safeguards or bypass authorization to perform tests.
* Keep database access limited to the queries and asset metadata required for this investigation.

Use safe connection handling. Do not enable shell tracing or print environment variables containing secrets. Where supported, use read-only database transactions, appropriate query timeouts, and a verified read-only database role.

**Important distinction:** Reading real production data is allowed. Modifying application source code locally is allowed. Persisting test changes to the production database is not allowed.

If a test requires running Detect Hallways or otherwise generating paths, use a safe local/staging database or isolated test fixture with representative production-derived data. If a safe environment is unavailable, use non-persisting analysis where possible and report the specific validation that remains blocked.

Do not imply that production data was successfully accessed unless the connection and queries actually succeeded.

---

# 2. UNDERSTAND THE PROJECT BEFORE MAKING CHANGES

Before coding, read the following project documents in full, where present:

```text
/Users/zubairzulifqar/pynwheel-staging/context.md

/Users/zubairzulifqar/pynwheel-staging/PYN_CONNECT_PROGRESS.md

/Users/zubairzulifqar/pynwheel-staging/tour-app-backend-api.md

/Users/zubairzulifqar/pynwheel-staging/tour-app-implementation.md

/Users/zubairzulifqar/pynwheel-staging/backend_implementation.md

/Users/zubairzulifqar/pynwheel-staging/backend_architecture_plan_report.md

/Users/zubairzulifqar/pynwheel-staging/backend_architecture_plan_for_ploting.md

/Users/zubairzulifqar/pynwheel-staging/gaps_map_plotting_feature.md

/Users/zubairzulifqar/pynwheel-staging/gaps_tour_setup_feature.md
overview.md
context.md
progress.md
prgress.md
PYN_CONNECT_PROGRESS.md
```

The spelling of the progress document may differ. Locate the actual file or files in the current project and read the correct versions rather than assuming a filename.

Also inspect relevant project documentation, including:

```text
gaps_map_plotting_feature.md
properties_detail_feature.md
gaps_properties_detail_feature.md
```

Read the relevant Tour App, map-rendering, asset-storage, API, plotting, wayfinding, and auto-detection documentation already maintained in the repository.

Locate and inspect the actual implementations for:

* Next.js Map & Plotting page and its components;
* SVG loading, rendering, sanitization, and error handling;
* background and foreground map rendering;
* floorplate and floor selection;
* floorplan, unit, and amenity image loading;
* map data/API repositories and response types;
* Rails controllers, models, and services supplying the map data;
* Detect Hallways / Auto Detect Hallways implementation;
* graph construction, nodes, paths, footprints, and walkable-area detection;
* wayfinding and shortest-path testing;
* Active Storage, Fog, S3, or other asset storage configuration;
* URL/signing/presigned-URL generation;
* the legacy HTML/ERB map implementation;
* existing tests covering these flows.

Use the current source code as the implementation source of truth. Use the documentation to understand the intended behavior and historical context.

Before modifying anything:

1. Check the current branch and working tree.
2. Preserve unrelated uncommitted work.
3. Identify the existing implementation and intended data flow.
4. Determine which application layer owns each behavior.
5. Establish reproducible failing cases.
6. Identify the appropriate tests to extend.

Do not overwrite existing documentation history or discard unrelated changes.

---

# 3. INCIDENT A — ALLIANCE / CYPRESS TERRA MAP IS BROKEN

## Production property

```text
Company: Alliance
Company ID: 198

Property: Cypress Terra
Property ID: 8005

Property URL:
https://pyn-system-connect-de8364f794a0.herokuapp.com/properties/8005

Map & Plotting:
Properties → Cypress Terra → Map & Plotting
```

This is a critical client property.

On the new Next.js environment, the map canvas displays:

```text
The floor SVG could not be loaded from the CMS.
```

The issue prevents the property from being used correctly in Map & Plotting.

The reported property appears to use a **dual-map configuration**, where the background map and the foreground plotting or wayfinding representation may be separate images or assets.

Confirm this from the actual database records, asset metadata, existing code, and uploaded reference screenshots. Do not assume the property configuration from its appearance alone.

## Required investigation

Trace the complete delivery and rendering chain:

```text
Production database metadata
        ↓
Property / building / floorplate records
        ↓
Original map asset and plotting asset
        ↓
Rails domain models and asset configuration
        ↓
API response / serializer
        ↓
Next.js API repository
        ↓
Map model and asset URL resolution
        ↓
Asset request
        ↓
SVG / background / foreground rendering
        ↓
Map interactions, plotting and wayfinding
```

Determine the exact point of failure.

Investigate:

* whether the floorplate actually has an SVG;
* whether a background image is stored separately;
* whether there is a distinct foreground or plotting image;
* whether the correct asset identifiers and storage keys are returned;
* whether the frontend expects an SVG when this property uses a different supported map format;
* whether the response contains an incorrect, missing, stale, relative, or malformed URL;
* whether CMS asset access or authentication is failing;
* whether the asset exists in the configured storage bucket;
* whether the database points to an asset stored in a different environment's bucket;
* whether the generated URL references the wrong bucket, host, prefix, or storage key;
* whether the request returns a redirect, expired signed URL, authorization failure, missing object, or incorrect content type;
* whether the actual response body is valid SVG or a different file type;
* whether rendering fails because of URL resolution, parsing, sanitization, dimensions, or frontend state.

Do not stop at the error message. It may be hiding a failure several layers earlier.

**Required outcome:** Identify and fix the root cause so Cypress Terra's correct map assets load in the new environment, with the background and foreground represented according to the existing Pynwheel data model.

---

# 4. INCIDENT B — FLOORPLATE, FLOORPLAN AND UNIT IMAGES ARE MISSING

For Cypress Terra, images associated with floorplates, floorplans, and units are also reportedly not displaying.

This might be related to the map-rendering issue, but do not assume that all failures share one cause.

Investigate each asset category independently.

## Trace the storage flow

```text
Database record
    ↓
Stored attachment / storage key
    ↓
Configured bucket and storage service
    ↓
Asset URL generation
    ↓
HTTP request
    ↓
Browser response
    ↓
Image rendering
```

Inspect the actual storage configuration and data, including relevant Active Storage or Fog associations, S3 bucket selection, object keys, prefixes, URL generation, and environment-specific settings.

Verify, where applicable:

* the database record references the expected image;
* the attachment or storage key is present;
* the referenced object exists;
* the application resolves the correct configured bucket;
* generated URLs are usable in the current environment;
* signed URLs are valid when requested;
* the HTTP response is successful;
* the content type matches the actual file;
* authentication and permissions are correct;
* relative URLs resolve correctly;
* browser CORS/CSP restrictions are not preventing access;
* frontend components are not discarding valid image URLs;
* failed images do not remain hidden behind stale loading states.

An important possibility to investigate is that a production database contains asset references whose files belong to another environment's storage bucket. Compare the actual stored reference with the application's active storage configuration.

Do not copy, move, delete, or modify production objects to make the test pass.

## Required outcome

Resolve the underlying shared asset-delivery problem if one exists.

Then verify all affected asset categories. Do not declare this issue fixed after only the main map starts displaying.

---

# 5. SUPPORT BOTH SVG MAPS AND DUAL-MAP CONFIGURATIONS

The application must not assume every property uses the same map representation.

The implementation needs to correctly handle all map types supported by the existing Pynwheel data model.

At minimum, investigate these configurations:

### A. SVG-based maps

The SVG is the primary map representation and may contain geometry, layers, paths, symbols, and other supported SVG elements.

### B. Dual-map properties

A property may use one asset for the visual background and another representation or asset for foreground plotting, units, paths, and wayfinding.

The renderer must preserve the intended relationship between these layers.

### C. Supported legacy map formats

Where the current application supports other image formats, retain their existing behavior. Do not break legacy properties while fixing SVG support.

## Map-rendering requirements

* Determine the map type from the actual data and supported application contract.
* Resolve the correct assets for the selected property and floorplate.
* Load the correct background and foreground layers independently where the data model requires it.
* Keep plotting, unit, amenity, stop, path, route, and interaction layers aligned.
* Preserve the intended coordinate system and transformations.
* Avoid using the same URL for different layers unless the data confirms that this is correct.
* Do not assume a background image is an SVG.
* Do not assume a valid foreground plotting asset means the background asset also loaded successfully.
* Do not silently substitute a different floor's asset.
* Do not replace an invalid or missing SVG with an unrelated PNG or placeholder.

For SVG maps, preserve genuine SVG rendering rather than rasterizing the file as a shortcut.

For dual-map properties, retain the intended separate background and foreground representations where required.

**Future requirement:** We plan to transition maps toward SVG. Implement a reusable solution that supports existing map configurations and makes SVG-based maps a first-class, dependable option across properties.

Do not introduce Cypress Terra-specific asset URLs, hardcoded property IDs, or special rendering conditions.

---

# 6. INCIDENT C — JENNIFER DEMO FP HAS DIFFERENT IMAGES IN PLOTTING AND WAYFINDING

A second critical case was observed in Jennifer Demo FP.

On floorplate 5, the Plotting and Wayfinding tabs appear to use different images or map representations. The correct-looking map appeared only after switching to Wayfinding.

This suggests that the two tabs might be resolving different assets, initializing different rendering paths, or maintaining inconsistent floor/map state.

Investigate the actual floorplate, background image, SVG, foreground plotting asset, and wayfinding asset associations before determining what the correct behavior should be.

## Reproduce the problem

Navigate to Jennifer Demo FP → Map & Plotting → floorplate 5.

Then:

1. Open Plotting.
2. Record which asset is requested and displayed.
3. Open Wayfinding.
4. Record which asset is requested and displayed.
5. Compare the actual asset URLs, stored references, dimensions, and contents.
6. Inspect any tab-specific state initialization or API requests.
7. Switch back to Plotting.
8. Change floors and repeat.

Verify the behavior with the actual browser Network panel and console.

## Fix requirements

* Plotting and Wayfinding must resolve the intended map assets consistently.
* Switching tabs must not unexpectedly reveal a different or previously unloaded background.
* Floor changes must load the correct assets.
* Cached or previously selected-floor assets must not leak into another floor.
* The foreground graph must align with the correct background.
* Shared asset resolution should be centralized where appropriate instead of duplicated in tab-specific code.

Do not simply force both tabs to render one image without understanding which background and foreground each operation requires.

The goal is consistent map identity and coordinate alignment while allowing each tab to display its appropriate interactive layers.

---

# 7. INCIDENT D — AUTO-DETECT HALLWAYS FAILS FOR CYPRESS TERRA

Hallway detection must work correctly for Cypress Terra wherever the available real map data supports reliable detection.

This is a critical requirement.

The detector currently appears to struggle with map configurations that do not expose the same SVG layers or structural conventions as the properties where it works.

Hazel is a useful comparison because hallway detection reportedly works there, but **Hazel is not the default or universal model for all US properties**.

Do not assume that Hazel's SVG layer names, background format, foreground representation, or floor structure apply to Cypress Terra.

## Required investigation

Inspect the real Cypress Terra assets and graph records to determine:

* how the map's background is represented;
* how the foreground plotting information is represented;
* whether an SVG exists for each relevant floorplate;
* whether the SVG contains usable hallway or walkable-area geometry;
* whether the geometry is embedded in groups, paths, polygons, masks, symbols, or other SVG elements;
* whether walkable regions are encoded in the foreground asset rather than the background;
* whether relevant structural information exists in an associated raster/image layer;
* whether persisted nodes and paths already exist;
* whether the current detector recognizes the actual layer structure;
* whether the detector incorrectly skips the floorplate because of missing or misclassified metadata;
* whether the API gives the detector the correct asset or only a partial map representation;
* whether the detector is failing during geometry extraction, corridor inference, graph construction, or persistence.

Compare Cypress Terra with Hazel and at least one other working SVG-enabled property. Identify the specific differences that explain the behavior.

## Required solution

If the current detector assumes a particular SVG layer name or structure, determine how to generalize it to the actual supported Pynwheel formats.

If the background and foreground are separate images, establish whether the required corridor information is available in either asset or its associated data.

Where SVG geometry can provide reliable walkable areas, use it.

Where relevant information is stored in a foreground or other supported image representation, investigate a generic image-analysis or geometry-extraction approach appropriate to that format.

Preserve real geometry and existing domain semantics. Do not generate arbitrary paths simply to make the test succeed.

If the available assets contain insufficient information for reliable automatic detection, explicitly identify that limitation and provide the most accurate diagnostic possible rather than inventing a graph.

However, do not stop at the first message saying that the format is unsupported. Investigate the actual Cypress Terra assets and implement the safest generic detector improvement supported by the data.

---

# 8. INCIDENT E — JENNIFER DEMO FP SVG HALLWAY DETECTION

Jennifer Demo FP exhibits additional detector failures.

One reported configuration is:

```text
3 floors
stackedFloors 1–3
```

When Detect Hallways is run, the application reports:

```text
No hallway detected

1 Processed
1 No hallway

No floorplate in this scope gave a hallway graph.
```

The detailed reason displayed is:

```text
no walkway layer and no Footprints layer to infer corridors from
```

On another floor, the UI reports:

```text
Nothing to detect

1 Processed
1 No SVG
```

with a floor-level explanation similar to:

```text
Skipped — no SVG
no floor SVG uploaded
```

The floorplate may also show existing stops such as units 301 and 302 and offer a shortest-path test.

These messages must be reconciled with the actual floorplate records, uploaded files, stored assets, and current graph.

## Determine the exact cause

For every affected floor, determine whether:

1. The floorplate genuinely has no SVG.
2. The SVG exists but the API or frontend fails to resolve it.
3. A different supported map asset exists but the detector ignores it.
4. The SVG is valid but does not expose the layer names the detector expects.
5. The detector receives the wrong floorplate or the wrong asset.
6. An existing graph is incorrectly being skipped or misclassified.
7. A stacked-floor configuration is being interpreted incorrectly.
8. The detector is reporting a generic reason that hides the actual error.

The phrase "No SVG" must not be accepted as sufficient evidence until the actual asset references and storage have been checked.

## Fix requirements

* Correct floor/asset resolution where it is wrong.
* Make the detector recognize supported real-world SVG structures generically.
* Handle legitimate missing-SVG cases explicitly.
* Avoid declaring successful detection when no meaningful graph was produced.
* Do not generate hallways from the wrong floor's map.
* Ensure stacked floors use their own correct assets and graph associations.
* Preserve already valid paths and explicit user-created data.

Where a floor genuinely has no SVG but a supported alternative asset contains adequate geometry, investigate whether the generic detector can safely use that representation. Do not silently fabricate an SVG or graph.

---

# 9. INCIDENT F — AUTO-DETECT HALLWAYS FAILS FOR JOHN DEMO FP

John Demo FP is another critical failure.

Investigate its real map assets, floorplate metadata, graph, and detection results.

The aim is to determine whether John Demo FP fails for the same reason as Cypress Terra or Jennifer Demo FP, or whether it has a separate cause.

Compare:

```text
Hazel
Cypress Terra
Jennifer Demo FP
John Demo FP
```

For each property, compare:

* map/asset type;
* SVG availability;
* SVG structure and relevant layer names;
* background and foreground assets;
* storage references;
* floor configuration;
* existing nodes and paths;
* stop connectivity;
* detection prerequisites;
* detector output and failure reason.

Do not add property-specific conditions. Use the comparison to discover the general assumptions in the current detector that do not hold across the dataset.

---

# 10. MAKE SVG SUPPORT THE PRIMARY FORWARD-COMPATIBILITY REQUIREMENT

Pynwheel plans to migrate maps toward SVG, so this investigation must strengthen SVG handling rather than merely restore the current examples.

The system should correctly handle valid SVG maps with varying:

* `viewBox`, width, and height;
* aspect ratios;
* coordinate origins and transforms;
* namespaces;
* groups and nested elements;
* IDs and CSS classes;
* inline styles;
* path and polygon structures;
* symbols and `<use>` references;
* embedded image references;
* supported external resource references;
* corridor, footprint, and walkable-area conventions.

Investigate actual SVGs from several properties before implementing generic parsing or detection behavior.

Do not assume that all SVGs use the same IDs, layer names, or document structure.

## Required principles

* SVG map delivery must be reliable.
* SVG rendering must be generic.
* Hallway detection must recognize the supported variations in actual Pynwheel SVG maps.
* Background and foreground assets must remain correctly aligned.
* The detector must not silently produce a successful result when it produces no usable paths.
* Invalid or genuinely missing SVGs must produce an accurate and actionable error.
* Existing supported raster/dual-map configurations must continue working.

Do not introduce an entirely new map model if the current model can be extended safely.

---

# 11. INCIDENT G — SVG LOADING ERROR AND BROKEN RETRY BUTTON

The current map UI displays:

```text
The floor SVG could not be loaded from the CMS.
```

The first requirement is to eliminate the underlying loading failure.

However, when an asset really is missing or temporarily unavailable, the error state must remain useful. The Retry button is currently not working.

Investigate the complete lifecycle of the failing request.

Check:

* the Retry button's click handler;
* event propagation;
* component state;
* query/cache behavior;
* URL or asset-reference state;
* request cancellation;
* stale asynchronous responses;
* loading and error transitions;
* error-boundary behavior;
* whether the retry invokes the actual failed asset request;
* whether an old error state prevents a new request;
* whether the request is retried with the same invalid URL;
* whether the response is incorrectly interpreted as a successful load.

## Required behavior

### Normal successful load

```text
Select property/floor
→ resolve correct asset
→ load map
→ render map
```

The error dialog should not appear when a valid map asset is available.

### Genuine loading failure

```text
Asset request fails
→ show meaningful error state
→ user clicks Retry
→ make a fresh, appropriate request
→ render map on success
```

Retry must actually attempt to resolve or fetch the correct asset again. Merely closing the dialog, toggling visibility, or reusing a permanently stale failed promise is not sufficient.

Ensure:

* loading state is visible while retrying;
* the button cannot trigger uncontrolled duplicate requests;
* a successful retry clears the error;
* a failed retry reports an accurate reason;
* no stale map from a previous floor is presented as the current floor;
* the error cannot remain permanently stuck after a successful response.

Do not retry indefinitely in the background or hide a genuine missing-asset error.

Test temporary network failures, unavailable files, invalid SVG content, and legitimate missing-SVG cases.

---

# 12. INVESTIGATE THE S3 / FOG / CMS STORAGE POSSIBILITY

Because multiple types of images are missing, investigate whether the issue is in shared asset delivery rather than individual UI components.

Trace the actual storage implementation in the codebase. This may include Rails Active Storage, Fog, S3, CMS integrations, custom asset URL helpers, and environment-specific storage configuration.

Verify:

1. Which asset storage mechanism the application actually uses.
2. Which storage key is saved for each affected asset.
3. Which bucket and host the running application resolves.
4. Whether the object is present at the expected location.
5. Whether the current environment uses the same naming/key rules as the environment where the asset was uploaded.
6. Whether a database record from another environment references a bucket or key that does not exist in the active configuration.
7. Whether asset URLs are public, signed, or authenticated.
8. Whether the generated URL is valid for the requesting frontend.
9. Whether the server redirects to the intended resource.
10. Whether the response contains the expected binary or SVG content.

Use read-only HTTP checks such as HEAD or GET where appropriate. Protect URL credentials and any signed query parameters from logs and reports.

Do not assume the correct solution is to change a bucket setting. Establish which configuration and asset reference are actually incorrect.

If the root cause is shared by many properties, fix the shared URL-generation, asset-resolution, configuration, or API layer rather than adding individual fixes for Cypress Terra, Jennifer Demo FP, and John Demo FP.

---

# 13. REVIEW THE WAYFINDING AND PLOTTING FLOW END TO END

Once map loading and asset resolution have been addressed, validate the actual map functionality for the affected properties.

For each representative property, test:

* map display on initial load;
* switching between Plotting and Wayfinding;
* switching buildings;
* switching floors;
* SVG loading and rendering;
* background and foreground alignment;
* zoom and viewport transformations where applicable;
* existing unit, amenity, and stop overlays;
* existing nodes and paths;
* Detect Hallways / Auto Detect Hallways;
* graph construction and node/path rendering;
* plotted-stop associations;
* shortest-path testing;
* routing across floors where supported;
* floor changes and map reinitialization;
* retry behavior after a deliberate asset-load failure.

Do not interpret a visible map as proof that the graph is correct.

Do not interpret a successfully returned graph as proof that the map and graph align.

Both visual correctness and functional wayfinding must be verified.

---

# 14. AUTODETECT VALIDATION MUST BE SAFE AND REPEATABLE

Test hallway detection with actual property-derived data in an isolated environment.

Where detection persists data, use a local or staging copy of the relevant floorplate data.

For each test:

1. Record the initial nodes and paths.
2. Run the existing Detect Hallways operation.
3. Record the detector's output, warnings, skipped-floor reasons, and resulting graph.
4. Verify that the resulting paths correspond to real walkable geometry.
5. Verify that connected stops can be routed to.
6. Run detection again and verify repeatability.
7. Check for duplicate nodes or paths.
8. Check that already valid paths are preserved according to existing business rules.
9. Check that explicit user changes and deletions are respected.
10. Reconcile and clean up temporary test records in the isolated environment.

Do not delete or overwrite valid existing paths merely because automatic detection was executed.

Do not alter production graph records during these tests.

If a property has an incomplete graph, distinguish a detector failure from a genuine lack of required map geometry or stop connectivity.

---

# 15. USE HAZEL AS A COMPARISON, NOT A SPECIAL CASE

Hazel currently provides a useful known-working reference for map rendering and hallway detection.

Investigate why it works and why the other properties fail.

The objective is:

```text
Valid Pynwheel map
        ↓
Correct asset resolution
        ↓
Correct background / foreground / SVG rendering
        ↓
Reliable plotting layers
        ↓
Generic hallway detection
        ↓
Valid graph and stop connectivity
        ↓
Correct shortest-path behavior
```

The same general implementation should support Hazel, Cypress Terra, Jennifer Demo FP, John Demo FP, and other supported map configurations.

Never implement behavior based on property name or ID, such as:

```typescript
if (propertyId === 8005) {
  // special map handling
}
```

unless a verified, explicit domain rule genuinely requires it.

Optimizations and renderer decisions should follow actual asset type, configuration, and geometry—not a hardcoded property identity.

---

# 16. TEST OTHER REAL PROPERTIES WITH SVG AND DUAL MAPS

Do not stop after fixing Cypress Terra.

Use read-only production inspection to discover the actual properties and floorplates available for testing.

Include, where present:

* Alliance / Cypress Terra;
* Jennifer Demo FP;
* John Demo FP;
* Hazel as the working reference;
* additional SVG-enabled properties;
* properties with a separate background and foreground;
* properties with multiple floors;
* properties with no SVG but a supported alternative map representation;
* properties with existing graph paths;
* properties where hallway detection is missing or incomplete.

Do not assume that every named property has the same configuration. Confirm actual data first.

For each tested floorplate, record:

* property name and ID;
* floorplate ID;
* building and floor;
* asset type;
* background asset availability;
* foreground asset availability;
* SVG availability;
* asset-request outcome;
* map-rendering result;
* existing nodes and paths;
* detector outcome;
* shortest-path outcome where applicable.

Avoid unnecessary retrieval or reporting of unrelated sensitive production data.

---

# 17. PERFORMANCE AND STATE MANAGEMENT

While investigating the above failures, ensure the fix does not introduce new map-loading or rendering regressions.

Check:

* duplicate asset requests;
* unnecessary reinitialization when switching tabs;
* repeated SVG parsing;
* repeated graph reconstruction;
* stale request results overwriting the selected floor;
* unhandled promise rejections;
* expensive SVG DOM updates;
* map components retaining incorrect asset state;
* repeated retries or duplicate error dialogs.

When the user changes a property or floor, the renderer must load the correct current asset and disregard obsolete responses.

When only the active tab changes, do not unnecessarily reload unrelated data if the existing architecture permits safe reuse.

Do not add complicated caching solely to mask incorrect URLs or broken state transitions.

---

# 18. TEST THE REAL BROWSER NETWORK AND CONSOLE

For each reproducible failure, capture evidence from the actual application.

Inspect the browser's Network and Console tools, and use server logs and read-only database queries as appropriate.

For every failed map/image request, record:

* requesting component or flow;
* sanitized request URL or asset identifier;
* HTTP status;
* content type;
* redirect behavior;
* response size where available;
* failure message;
* expected asset type;
* actual result.

Never put signed URLs, access keys, connection strings, passwords, or secret query parameters into logs or final documentation.

Separate these failure categories:

```text
Asset reference missing
Asset URL incorrectly generated
Storage object unavailable
Authentication / permission failure
Network / HTTP failure
Invalid SVG or image
Unsupported SVG structure
Frontend state / rendering failure
No usable hallway geometry
Graph / stop connectivity failure
```

Implement fixes at the correct layer.

---

# 19. AUTOMATED TESTS

Add or extend tests that cover the actual bugs and their root causes.

## Asset and renderer tests

* valid SVG loads and renders;
* dual-map background and foreground load independently;
* expected assets are selected for the correct floorplate;
* asset URLs resolve correctly;
* missing or inaccessible assets produce clear errors;
* Retry triggers a new request;
* successful Retry clears the error;
* stale requests cannot overwrite the selected floor;
* switching Plotting and Wayfinding does not select the wrong map;
* floor changes do not reuse another floor's asset;
* supported legacy image rendering remains intact.

## Hallway-detection tests

* SVG with supported walkable geometry;
* SVG with different valid group and layer naming;
* SVG with nested geometry and transforms;
* SVG without a recognized walkway layer but with other usable geometry;
* dual-map data with usable foreground geometry;
* genuinely missing SVG;
* genuinely missing walkable information;
* existing graph and paths;
* repeat detection;
* already connected and disconnected stops;
* multiple floors;
* malformed SVG;
* unavailable asset.

Tests must assert meaningful outcomes, not merely that the request returns HTTP 200.

## Integration tests

Exercise the relevant real application flow:

```text
Property / floorplate data
→ API serialization
→ asset URL resolution
→ SVG/background/foreground delivery
→ map renderer
→ plotting and wayfinding layers
→ hallway detection
→ graph
→ stop connectivity
→ shortest-path test
```

Use fixtures or an isolated database for scenarios requiring persisted graph changes.

---

# 20. DO NOT BREAK EXISTING PYNWHEEL FUNCTIONALITY

The focus is the Next.js Map & Plotting and wayfinding functionality directly affected by these bugs.

Do not expand this task into unrelated changes to:

* Companies and Properties;
* Inventory;
* unrelated admin UI;
* unrelated Tour Setup features;
* unrelated legacy application features.

Preserve existing behavior of the legacy HTML/ERB application.

If a shared Rails model, service, asset helper, or API must change, verify that the change is backward compatible.

Do not modify saved production graph data merely to make the new detector pass.

Do not change the underlying meaning of existing nodes, paths, floorplate associations, or unit/amenity records.

Prefer the existing domain services and models over duplicate implementations.

---

# 21. DOCUMENTATION UPDATES

After implementing and testing the fixes, append dated entries to the relevant project documentation, preserving the existing history.

Update, where appropriate:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
gaps_map_plotting_feature.md
gaps_properties_detail_feature.md
```

Update any existing SVG, asset-delivery, wayfinding, or auto-detection technical documentation affected by the changes.

Only update documents that exist and are relevant. Do not create duplicate documents unnecessarily.

Document:

* verified root causes;
* affected application layers;
* asset-delivery corrections;
* SVG and dual-map behavior;
* hallway-detection changes;
* relevant API/contract changes;
* regression coverage;
* real property/floorplates inspected;
* actual test results;
* production-data safety limitations;
* known remaining issues.

Distinguish code changes from changes verified against real production data.

---

# 22. REQUIRED FINAL TEST MATRIX

Create a test matrix based on actual observations.

| Property            | Floorplate | Map type | Asset loading | Plotting  | Wayfinding | Auto Detect | Route test |
| ------------------- | ---------- | -------- | ------------- | --------- | ---------- | ----------- | ---------- |
| Cypress Terra       | Actual ID  | Verify   | PASS/FAIL     | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | PASS/FAIL  |
| Jennifer Demo FP    | Actual ID  | Verify   | PASS/FAIL     | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | PASS/FAIL  |
| John Demo FP        | Actual ID  | Verify   | PASS/FAIL     | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | PASS/FAIL  |
| Hazel               | Actual ID  | Verify   | PASS/FAIL     | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | PASS/FAIL  |
| Additional property | Actual ID  | Verify   | PASS/FAIL     | PASS/FAIL | PASS/FAIL  | PASS/FAIL   | PASS/FAIL  |

Use actual identifiers and observed outcomes. Add rows for multiple floors and different map types as needed.

Do not fill unknown values with assumptions. Distinguish:

* PASS — actually executed and verified;
* FAIL — actually executed and failed;
* BLOCKED — could not be executed, with the reason;
* NOT APPLICABLE — the test does not apply to the actual configuration.

A missing asset or unavailable test environment must never be reported as a pass.

---

# 23. FINAL ACCEPTANCE CRITERIA

The work is complete only when the evidence demonstrates the following.

### Cypress Terra

* Correct background and foreground assets are resolved.
* The map renders correctly on the relevant floorplates.
* Floorplate, floorplan, and unit images load where their records reference valid assets.
* Plotting and wayfinding work against the correct map representation.
* Auto Detect is tested against actual map data.
* Shortest-path behavior is verified wherever the graph supports the requested route.
* No production data has been modified during testing.

### Jennifer Demo FP

* Plotting and Wayfinding resolve the correct map assets.
* Floorplate 5 displays the intended map consistently across tabs.
* Floor changes select the correct assets.
* The reported "No SVG" and "no walkway layer" cases have been investigated against actual data.
* Hallway detection produces valid results wherever adequate supported geometry exists.

### John Demo FP

* The actual cause of the Auto Detect failure is identified and resolved where possible.
* Detection and route behavior are tested with the actual floorplate configuration.

### Hazel

* Existing working behavior remains intact.
* Generic changes do not regress the known-working reference property.

### Other properties

* Multiple additional real properties are checked.
* Different SVG structures and dual-map configurations are represented.
* The renderer and detector do not depend on hardcoded property IDs.

### Retry and error handling

* Valid maps load without displaying an erroneous failure dialog.
* A genuine failure shows an accurate diagnostic.
* Retry triggers a real, fresh attempt and recovers when the underlying issue is resolved.

### Safety and regression

* Production database access remains read-only.
* No production database writes or schema changes were performed.
* No production assets or graph records were modified.
* Existing supported map types and legacy application behavior remain intact.

---

# 24. FINAL REPORT

Create or update the appropriate final QA report in the project repository. If a report already exists for this task, update it rather than creating a duplicate.

Include:

## Root Cause Summary

Explain the confirmed root cause of each issue and identify the responsible layer.

## Cypress Terra

Report the actual asset configuration, SVG/background/foreground findings, image delivery results, plotting and wayfinding status, and hallway-detection outcome.

## Jennifer Demo FP

Report the floorplate 5 rendering discrepancy, the investigation of the reported missing-SVG cases, and actual detection results.

## John Demo FP

Report the confirmed cause of the Auto Detect failure and the result of testing the fix.

## Hazel Regression

Record the tests confirming that existing behavior remains correct.

## Other Properties Tested

List actual properties and floorplates, with their relevant map types and outcomes.

## Auto-Detect Validation

Describe the real geometry inspected, detector changes, graph correctness, repeatability, and isolated test-data cleanup.

## Asset Delivery

Document the actual storage/URL failure, if any, and how it was verified and fixed.

## Automated Tests

List tests added or changed and the actual results.

## Database Safety

Explicitly confirm that production remained read-only, or clearly disclose any unexpected access issue. Do not claim this without evidence.

## Remaining Issues

List all failures, unsupported input formats, and tests that remain blocked.

## Files Changed

List the relevant source files, tests, and documentation updated.

## Final Status

Choose one:

```text
RESOLVED — ALL REQUIRED TESTS PASSED
```

or:

```text
NOT RESOLVED — REQUIRED TESTS FAILED OR REMAIN BLOCKED
```

Do not claim completion based only on the disappearance of an error message. The map, its layers, its graph, and its hallway-detection behavior must be independently verified.

---

# FINAL INSTRUCTION

Start by understanding `overview.md`, `context.md`, and the actual project progress document. Then inspect the source code and read-only production data, reproduce the failures, and determine the root causes before editing.

**The priority is to fix the real asset-loading and hallway-detection problems for Cypress Terra, Jennifer Demo FP, and John Demo FP while keeping Hazel working.**

Build a reusable solution for SVG and supported dual-map configurations across the Pynwheel dataset. Do not introduce property-specific hacks, fabricate paths, hide failed assets behind placeholders, or change production data.

The expected result is a reliable map pipeline:

```text
Real Pynwheel data
        ↓
Correct floorplate and asset references
        ↓
Correct background / foreground / SVG delivery
        ↓
Reliable rendering in Next.js
        ↓
Plotting and wayfinding alignment
        ↓
Generic hallway detection
        ↓
Valid persisted graph in the appropriate environment
        ↓
Accurate stop connectivity and shortest-path testing
```

**Diagnose first, fix at the correct layer, test against diverse real property configurations, and report only what the evidence proves.**
