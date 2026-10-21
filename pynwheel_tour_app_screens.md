# PYNWHEEL SELF TOUR APP — START TOUR EXPERIENCE, MAP, UNLOCK FLOWS, SCHEDULING INTEGRATION & DESIGN QA

## 1. Objective

Implement and refine the Start Tour experience in the existing Capacitor Self Tour App using the latest design and interaction states in the Claude Design artifact.

**Live design reference:**

https://claude.ai/design/p/13d18a36-ed41-492e-b118-e69e26e4636a?via=share&file=Pynwheel+Self+Tour+App.dc.html

The required work includes:

- Build Your Tour and stop management.
- Add Stops.
- Unit and amenity detail screens.
- All supported lock/unlock UI variants.
- Guided Navigation and elevator access.
- Map and route visualization.
- Route replay and audio-guide behavior.
- Integration with the actual Scheduling and Booking functionality already implemented in the CMS.
- A visual consistency review of other relevant screens without disrupting their existing functionality.

Most of the app is already implemented. The goal is to **extend and correct the existing application, not rebuild it from scratch**.

Preserve the working map, route generation, backend integration, authentication, existing lock services, and other functional areas. Use existing components and data models wherever possible.

---

# 2. Branch and Git Safety

Create a new feature branch based on the current `main` branch.

Suggested branch name:

```text
feature/self-tour-start-tour-experience
```

**Do not create a new Git worktree or clone. Use the existing repository and working directory.**

Before creating the branch:

1. Inspect the current branch and working-tree status.
2. Identify all modified and untracked files.
3. Confirm that the correct `main` contains the latest integrated application changes.
4. Preserve any existing uncommitted work.
5. Create the feature branch without losing or overwriting existing changes.

If another Claude session is working on the same checkout, do not switch branches or manipulate the working tree in a way that disrupts that session. Identify the conflict and preserve the in-progress work before proceeding.

Do not reset, clean, discard, or overwrite unrelated changes. Do not automatically push, merge, or deploy.

Keep the changes focused on the Self Tour App and the backend/API integration genuinely required for Scheduling and Booking.

---

# 3. Read the Project Context Before Coding

Read the latest versions of the relevant documentation:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
tour-app-implementation.md
tour-app-backend-api.md
tour-app-design-refresh-report.md
tour-app-igloo-integration.md
tour-app-igloo-bluetooth.md
```

Locate the actual files and directories rather than assuming every document exists in the repository root.

Also inspect:

- The recent Self Tour App redesign implementation.
- The CMS Scheduling and Booking implementation.
- Existing API repositories and TypeScript response types.
- Existing map and SVG rendering components.
- Route generation and route instructions.
- Existing Play Route and audio-guide implementations.
- Current stop-selection and tour-state management.
- Existing lock providers and access services.
- Android/Capacitor configuration.
- Existing tests and known limitations.

Inspect the current code before making changes. Determine what already works and where the design or functional gaps actually exist.

**Do not replace working logic just because its current UI differs from the design. Prefer minimal changes to the existing implementation.**

---

# 4. Access the Live Claude Design Artifact — Do Not Rely on a Download Alone

Open the supplied design project through the existing Claude/Chrome browser session, using the authenticated session if necessary.

The live artifact is important because it contains multiple tweaks, selectable variants, and evolving interaction states that may not be represented completely in a downloaded HTML file.

**Do not treat a downloaded HTML export or one static screenshot as the complete design specification.**

Inspect the live artifact directly and review every accessible relevant screen, interaction, and tweak.

In particular:

- Explore every Build Your Tour layout.
- Explore all Unlock screen method variants.
- Review both unit and amenity details.
- Review navigation directions and elevator transitions.
- Review Add Stops and its filters.
- Review map-related controls and the expected route-replay behavior.
- Review the audio-guide and Pause/Play behavior.
- Review booking and scheduling flows shown in the artifact.
- Review related screens that are supposed to receive design refinements.

If the artifact provides selectable states such as `Demo · Method`, actually switch between them and inspect the resulting UI rather than assuming the different states are separate screens with identical behavior.

Inspect all seven previously documented demo/design scenarios where they remain applicable.

Record each accessible design requirement and map it to the existing application component.

If an important tweak or interaction cannot be accessed, inspect the existing documentation and exported assets. Ask me for a specific screenshot or missing artifact only if the unavailable design state materially prevents correct implementation. Do not silently invent an expected design.

---

# 5. Scope and Existing Functionality

Separate the work into three categories.

### A. Existing functionality that must be preserved

Preserve the current implementation wherever it already works, including:

- Login and session handling.
- Property selection.
- Tour construction.
- Real stop data.
- Existing map and SVG rendering.
- Existing route generation.
- Route instructions.
- Existing Play Route functionality.
- Existing lock/PIN/Bluetooth services.
- Existing navigation and other application pages.

### B. New or incomplete UI behavior

Implement the visual and interaction refinements required by the supplied design, including the missing map controls, stop-management interactions, access-method presentations, and unit/amenity details.

Reuse existing handlers and services whenever possible.

### C. Scheduling and Booking backend integration

The CMS Scheduling and Booking functionality is already implemented and must now be connected to the relevant existing Self Tour App flows.

Inspect the current CMS APIs and business logic first. Reuse them wherever possible. Add a minimal compatible backend/API extension only if the existing endpoints cannot support the actual mobile workflow.

Do not add duplicate scheduling rules or booking logic in the mobile app.

**Keep the existing functionality of unrelated app pages unchanged. Apply consistent visual refinements where represented in the design, but do not broadly redesign or rewrite unrelated workflows.**

---

# 6. Build Your Tour — Correct Stop Selection and Route Summary

Implement the Build Your Tour screen according to the design.

The reference contains:

- A recommended route.
- A stop count and estimated total duration.
- An All Floors selector.
- A Your Tour section.
- Add Stops.
- Stops grouped by building, floor, or outdoor area.
- Unit and amenity summaries.
- Removal of selected stops.
- A Let's Go action.

Use the actual data model and existing tour state.

## 6.1 Tour summary

Display:

- The number of selected stops.
- Estimated tour duration when supported by the current route data.
- The recommended route and ordering.
- Relevant property/building/floor context.

Do not hardcode counts or durations from the design.

Recalculate or refresh the summary using the appropriate existing route/state logic after adding, removing, or reordering stops.

## 6.2 Stop groups

Display stops grouped according to the actual building, floor, and outdoor-area information.

The design illustrates groups such as:

- Outdoor / Grounds.
- Tower A — Ground or specific floors.
- Tower B — specific floors.
- Tower C — Ground.

These are examples, not a fixed building structure.

Use actual property data and keep the grouping generic.

## 6.3 Removing stops

Allow users to remove stops from the planned tour through the supported UI interaction.

After removal:

- Update the selected stop list.
- Update the count.
- Recalculate or refresh the route where appropriate.
- Update the estimated duration when supported.
- Preserve the order of the remaining stops.
- Prevent stale map markers and directions from remaining visible.

Removing a stop from the planned tour must not delete the actual Tour Stop from the backend.

## 6.4 Recommended route

Preserve the current route-generation service and use its real results.

Do not invent route geometry or replace the actual route with a hardcoded sequence simply to match the reference screenshot.

If the current backend or route model cannot produce a valid recommended route, show the appropriate error or unavailable state instead of creating a fake route.

## 6.5 Let's Go

Connect Let's Go to the existing tour-start/navigation workflow.

Starting the tour must preserve:

- The selected stop list.
- The current route.
- The current route step.
- Relevant map state.
- Any established tour/session state.

Do not start a disconnected demo flow while leaving the existing tour state behind.

---

# 7. All Floors Selector and Map Controls

The existing map is working and must remain the foundation for this feature.

**Do not replace the current MapView or existing map-rendering pipeline with a new map implementation unless a verified defect makes a minimal correction necessary.**

Add the required controls to the existing map components.

## 7.1 All Floors selector

Implement an All Floors dropdown or equivalent control that lets users switch between the actual available building floors.

The control should:

- List available floors from real property/building data.
- Switch the displayed floor map.
- Load or reuse the correct SVG/map.
- Display the stops, route segments, and markers that belong to the selected floor.
- Preserve the correct property and building context.
- Avoid stale map content after switching.
- Support floors represented by the actual property configuration, including multiple buildings.

Do not hardcode the example floors.

## 7.2 Maximize map

Implement the maximize/full-map control shown or implied by the design.

When expanded:

- Use the available screen area appropriately.
- Respect mobile safe areas.
- Keep map interactions functional.
- Maintain the current selected floor and relevant route state.
- Provide a clear way to return to the normal layout.

Do not reload the entire app or unnecessarily refetch the map when maximizing.

## 7.3 Zoom and locate the selected stop

Preserve existing zoom, pan, and map gestures.

Add a locate/zoom-to-stop behavior that allows the user to focus the map on the selected unit or amenity.

The action should:

1. Identify the selected stop's real map coordinates or current map location.
2. Select the correct building and floor.
3. Center the map on the stop.
4. Zoom to an appropriate level.
5. Highlight the selected marker where supported.
6. Keep the stop and route overlays aligned with the SVG.

If the selected stop is on another floor, switch to the correct floor before centering the map.

Do not use arbitrary property-specific offsets.

## 7.4 Route overlay and replay

The current app needs the route path to remain visible on the existing map and a convenient replay control.

Implement:

- The real current route overlay.
- Correct route alignment with the SVG.
- The current pointer/position where already supported.
- A small replay icon on the map.
- A replay action that reruns the existing route animation from its defined starting point.
- A clear distinction between replaying the entire route and resuming the current step.

The replay icon must not invoke a new route API request unless route regeneration is genuinely required by an established workflow.

Replay should use the current route data and existing animation engine.

During animation, the map must remain responsive. Avoid reconstructing the entire SVG or route geometry on every frame.

---

# 8. Avoid Stairs — Respect Real Routing Rules

Implement the Avoid Stairs option as a functional routing preference, not just a visual toggle.

The design expects the route to use elevators rather than stairs when the preference is enabled.

First inspect the existing route API, graph structure, and routing options to determine how step-free routing is currently represented.

When Avoid Stairs is enabled:

- Request or calculate a route that respects the supported step-free/elevator preference.
- Use actual elevator and cross-floor relationships.
- Display the correct route on the map.
- Update route instructions to describe the actual elevator journey.
- Include secured-floor unlock steps when the existing backend provides the required access information.
- Handle unreachable floors or missing elevator connections accurately.

When Avoid Stairs is disabled, preserve the existing supported route-selection behavior.

Do not draw a fake elevator route if no valid connection exists.

Do not change the meaning of saved graph data or implement a second shortest-path algorithm independently in the frontend.

If the current backend has the required option, reuse it. If a minimal additive API change is necessary, preserve existing route contracts and business logic.

---

# 9. Guided Navigation and Route Instructions

Keep the existing route/navigation experience and update it to match the design.

The design includes:

- Stop sequence and count.
- Walking duration and distance.
- From/to information.
- Directions.
- Elevator instructions.
- Current floor.
- Unlock actions at secured access points.
- Arrival confirmation.
- Skip-stop behavior where supported.
- Play guide.
- Route replay.
- Time remaining and relevant tour controls.

Use actual route and stop data.

## 9.1 Step-by-step navigation

Display the actual route instructions returned by the existing backend or produced by the established route presentation logic.

Examples of instruction types include:

- Walking to the elevator.
- Unlocking an elevator reader for a secured floor.
- Taking the elevator.
- Walking along the destination floor.
- Arriving at a stop.

Do not hardcode the example buildings, distances, stop names, or floor numbers.

Update the active instruction as the route progresses.

## 9.2 Elevator access

Where an elevator or secured floor requires an access operation:

- Show the appropriate instruction at the correct route step.
- Use the existing lock service and supported provider behavior.
- Display the correct access method configured for that stop.
- Provide an unlock action when supported.
- Handle unavailable or failed access.
- Provide the existing supported help or skip behavior.

Do not claim a floor was unlocked merely because the user opened the Unlock screen.

## 9.3 Arrival and skipping

Use existing tour-state semantics for confirming arrival and skipping a stop.

When a stop is skipped, preserve the correct sequence and update the remaining route according to the existing behavior.

Do not delete the underlying CMS Tour Stop.

---

# 10. Audio Guide — Pause, Resume, and Continue From the Correct Step

The audio-guide interaction must follow the current route state. This is a critical detail.

The design has Play guide and Pause guide behavior. The narration must remain synchronized with the current navigation progress.

### Required behavior

- Play guide starts narration at the appropriate current step.
- Pause guide pauses the current narration and preserves its position.
- Resume continues from the appropriate paused position rather than restarting the whole tour.
- Advancing to the next stop speaks the narration relevant to the next stop.
- Returning to the guide after completing an earlier part of the tour must not automatically repeat narration from the very first step.
- The next narration segment must not replay previously completed segments unless the user explicitly requests a full replay.
- Playback state must remain coherent when the user changes screens or floors.
- Replay Route must not accidentally reset the audio guide unless that is the existing, explicitly intended behavior.

Inspect the current audio/narration implementation and determine whether it uses text-to-speech, audio files, or another supported mechanism.

Reuse that mechanism. Do not introduce a duplicate narration system.

Keep the audio step/index and current route step in a consistent state.

If the existing audio implementation lacks the required resume semantics, make the smallest focused frontend change and add regression tests.

---

# 11. Unit and Amenity Detail Screens

Implement the redesigned Unit and Amenity detail experience using actual property inventory data and existing CMS configuration.

The design contains the stop number, category, name, floor, estimated duration, opening hours, access method, unit facts, photos, videos, 360-degree views, notes, and related information.

Not every entity supports every field. Render data according to its actual type and availability.

## 11.1 Shared details

Where supported by existing data, display:

- Stop number and total stop count.
- Unit or amenity category.
- Name.
- Building and floor.
- Estimated time to the stop.
- Relevant operating hours.
- Access method.
- Photos and other available media.
- Directions or visitor instructions.
- Relevant help or skip actions.

Use the existing Tour Stop and inventory data.

Do not assume every stop is a unit, every unit has an access device, or every amenity has identical opening-hours information.

## 11.2 Automatically generated About This Space

**About This Space must be generated from the actual unit or amenity information. It is not a user-entered description field in this workflow.**

Reuse the available property data to assemble the summary, including relevant fields such as:

- Unit type.
- Bedrooms and bathrooms.
- Square footage.
- Availability.
- Price.
- Existing amenity details.
- Other supported property information.

Do not fabricate missing information.

Do not introduce a separate user-editable About This Space field or new CMS API for this purpose.

If the existing app already contains a helper for presenting unit information, reuse it.

## 11.3 Unit facts

Display actual unit data, where available:

- Rent/price.
- Bedrooms.
- Bathrooms.
- Square footage.
- Move-in availability/date.
- Unit type.
- Existing supported concessions or leasing information.

Do not hardcode example values such as prices, bedroom counts, or availability dates.

If a unit field is absent, follow the established UI convention for missing information rather than displaying invented values.

## 11.4 Price by lease term and move-in estimate

The design shows price by lease term and a move-in cost estimate.

First inspect the existing unit/lease data sources.

If these values exist, display them from the actual data.

If the app already has legitimate calculations for lease pricing or move-in costs, reuse them.

Do not invent pricing rules, concessions, deposits, fees, or totals.

Do not claim that an estimate is a final quote. Follow the existing product semantics and any applicable disclaimers.

If the necessary data is unavailable, display only supported information and document the gap rather than fabricating prices.

## 11.5 Floor plan and unit map

For units, preserve the existing floor-plan/map presentation and its current interactions.

Support the designed zoom controls where available, including plus/minus and other existing gestures.

The location/locate action must navigate to the correct map floor and zoom to the unit's actual position.

Do not introduce a second map renderer.

---

# 12. Photos, Video, 360-Degree Views, and Notes

Follow the distinction between CMS-managed content and user-reference content.

### CMS-managed content

Video and 360-degree views, where supported, must come from the existing CMS/property data sources.

The app must not invent or hardcode media URLs.

Reuse existing assets and current media-handling conventions.

### User-reference notes and photos

The design also allows users to add personal notes or reference photos.

Inspect whether this capability already exists in the app or backend.

If an existing persistence mechanism is available, reuse it.

If no backend support exists, implement the UI interaction locally without claiming the notes/photos are synchronized or saved to the CMS. Do not create a new API solely for this feature unless separately authorized.

Ensure that personal reference content does not overwrite the property's official CMS-managed images or media.

### Media interactions

Where supported by the design:

- Open the full photo collection.
- Preview videos.
- Open 360-degree views.
- Add or view personal notes/photos.
- Close the media view and return to the correct stop.
- Handle missing or failed media.
- Preserve current stop and route state.

Do not display a non-functional player or pretend unavailable media exists.

---

# 13. Unlock Screens — One Shared Framework, All Supported Access Methods

The Claude Design artifact presents a shared Unlock screen with multiple provider/method variants.

Each Tour Stop must use the **actual access method configured by the property's operator**, not a globally hardcoded method.

A single tour may include stops that use different providers and access methods.

Preserve the shared Unlock screen layout while rendering the appropriate method-specific content.

Inspect all relevant `Demo · Method` variants in the live artifact.

## 13.1 Bluetooth / mobile key

The design illustrates a Bluetooth-based unlock flow with:

- Mobile-key status.
- Bluetooth availability.
- Lock proximity or readiness, where the SDK exposes it.
- Tap or slide to unlock.
- Instructions to hold the phone near the reader.
- Access validity information.
- Failure, help, and skip actions.

Use the existing native Bluetooth plugin and provider services.

Do not fabricate Bluetooth availability, proximity, connection state, access validity, or successful unlocking.

When unsupported on the current platform or device, show the real unavailable state.

## 13.2 PIN / keypad

The design illustrates a temporary PIN flow with:

- PIN issuance information.
- The actual access code.
- Copy action.
- Expiration time.
- Keypad instructions.
- Confirmation that the code was entered.
- Error or expired-code handling.

Reuse the existing PIN endpoints and services.

Verify the required provider mode before requesting a code.

Do not generate PINs locally or use example PINs in real mode.

Ensure that expired, unavailable, unsupported, and failed requests are handled correctly.

The keypad or confirmation interaction must not imply that the physical door unlocked unless a supported backend/provider response establishes that fact.

## 13.3 Remote unlock / cloud or hub

The design includes a remote/cloud unlock variant that does not require Bluetooth.

Use the appropriate existing provider service, based on the actual stop configuration.

Do not call a Bluetooth service for a cloud-based lock unless the established provider implementation explicitly requires it.

Show real loading, success, failure, and unavailable states.

## 13.4 Gate / garage

The design includes a gate/garage variant with:

- Gate identity.
- Provider information.
- An Open gate action.
- Gate-specific instructions.
- Automatic closure guidance where applicable.

Use the actual supported provider flow, such as an existing gate integration when configured.

Do not claim the gate opened merely because a button was tapped.

Use real property-specific instructions if available. Never hardcode the example street directions into general-purpose behavior.

## 13.5 Other providers

Also inspect the existing lock integrations, which may include Igloo, Pynwheel Access/Zerv, RemoteLock/Edge State, Latch, Dwelo, myQ, dormakaba, and others.

Discover which provider integrations and access methods are genuinely supported by the current system.

Reuse the existing service interfaces and methods.

Do not infer that the design's provider examples mean every integration is available for every property.

For unsupported methods, show an explicit, honest UI state rather than a fake unlock button that always succeeds.

---

# 14. Unlock Failure, Alternate Methods, Help, and Skip

The design includes:

- Didn't work? Try another method.
- Report an issue.
- Call leasing.
- Skip this stop and continue.

Implement these interactions using existing capabilities.

### Try another method

Determine the valid supported access methods for the current stop.

Allow the user to choose an alternate method only when the backend/provider configuration supports it.

Do not invent a PIN fallback when the provider supports Bluetooth only, or a remote-unlock alternative when no such configuration exists.

### Report an issue

Reuse an existing issue-reporting or support mechanism when available.

If none exists, implement the UI-only state without pretending that an issue was submitted to a server.

### Call leasing

Use the actual property contact number where available.

Do not hardcode a demonstration phone number.

If no contact number exists, show an appropriate unavailable state.

### Skip this stop

Use the existing tour-state implementation to skip the current stop where permitted.

Update the remaining navigation sequence consistently.

Do not delete the source Tour Stop or alter its CMS configuration.

---

# 15. Map Navigation, Route Replay, and Elevator Unlocking

The design shows a detailed navigation sequence for a secured elevator:

1. Walk to Elevator A.
2. Unlock Elevator A for the destination floor.
3. Take the elevator to the target floor.
4. Walk to the final stop.
5. Arrive at the destination.

Implement the actual equivalent using real route steps.

### Requirements

- Correct floor and building.
- Correct destination.
- Actual walking distance and route data.
- Elevator transition where required.
- Access operation at the correct step.
- Appropriate failure and help actions.
- Arrival confirmation.
- Floor-map switching.
- Accurate route overlay.
- Map replay control.
- Audio-guide synchronization.

A secured-floor instruction must be associated with the relevant elevator/lock configuration, not the destination unit by default.

If the destination floor cannot be reached through supported graph/vertical connections, show a clear error or unavailable state.

Do not bypass graph connectivity or invent floor transitions to make the demo appear successful.

---

# 16. Add Stops — Real Eligible Units and Amenities

Implement the Add Stops screen shown in the artifact.

The design includes:

- Search or filter.
- Units and Amenities category selection.
- Building and floor filters.
- Unit preferences.
- Availability.
- Grouped stop cards.
- Add action per eligible stop.

Use the real stop, unit, and amenity data available from the existing API.

## 16.1 Category filters

Where supported, provide the appropriate categories such as:

- All.
- Units.
- Amenities.

Do not include unsupported entity types merely to match example labels.

## 16.2 Building and floor

Allow filtering by actual buildings, floors, and outdoor areas associated with the selected property.

Do not hardcode Tower A, Tower B, Tower C, or the example floor list.

## 16.3 Unit preferences

The design illustrates preferences such as:

- Any beds.
- Studio.
- 1 Bed.
- 2 Bed.
- 3 Bed.
- Available now.

Implement filters from the actual unit fields and availability data.

Ensure missing values do not accidentally pass filters intended to require a specific bedroom count or availability status.

Do not invent availability from a unit name or other unrelated field.

## 16.4 Add eligible stops

The main purpose is to let users add available stops that are not currently selected.

Verify:

- Already-selected stops are identified correctly.
- Duplicate additions are prevented.
- The correct property/floor context is preserved.
- The selected stop is added to the planned tour.
- The count and route state update appropriately.
- The user can dismiss or return from the Add Stops view.
- Search and filter state behaves consistently.
- Empty results have a useful explanation.

Adding a stop to the user's planned tour must not create a duplicate Tour Stop in the backend.

Use the current tour-state/store implementation.

---

# 17. Schedule and Book Tours Using the Real CMS Configuration

This is a functional integration requirement, not just a visual design change.

The CMS Scheduling and Booking functionality is already implemented. The Self Tour App currently uses dummy data in some relevant areas.

**Replace dummy scheduling/booking data with actual backend data where it applies to the existing app flow.**

Do not leave the app displaying example availability when the relevant real backend data is available.

## 17.1 Discover existing API support first

Inspect the current Rails endpoints, Connect/BFF routes, repositories, and booking services.

Reuse the existing implementations for:

- When tours can be booked.
- Tour types.
- Time slots.
- Visiting hours.
- Grace-period and booking-window rules.
- Booking Form requirements.
- Property-specific Booking Link/widget behavior.
- Booking creation and confirmation.
- Visitor record creation and status.

Do not duplicate the CMS's scheduling or booking rules in the mobile frontend.

## 17.2 Schedule Self-Tour flow

Connect the existing app scheduling flow to the real backend configuration.

Where the current design supports scheduling, ensure the app:

1. Loads the correct property.
2. Retrieves the supported tour types.
3. Displays valid available dates and times.
4. Respects visiting hours and availability.
5. Applies the existing booking-window and scheduling rules.
6. Displays the actual applicable Booking Form fields.
7. Validates user input.
8. Submits the booking through the established backend.
9. Displays the backend-confirmed result.
10. Makes the booking available in the existing CMS Visitors module.

If the existing app already implements parts of this flow, reuse them and replace only the relevant dummy values and handlers.

Do not introduce a second booking implementation.

## 17.3 Unit selection and booking

Where the app offers a tour or unit-related booking action, inspect the actual intended behavior.

Connect it to existing scheduling/booking services where appropriate.

Do not automatically create a booking merely because the user views a unit or adds it to the planned tour.

Keep these concepts distinct:

- Selecting a stop for a tour.
- Viewing a unit.
- Choosing a tour date/time.
- Submitting a reservation.
- Starting the actual self-guided visit.

## 17.4 Backend gaps

If the existing CMS backend already supports the required flow, reuse it.

If an endpoint is genuinely missing, implement only the minimum compatible API extension required by the existing business rules. Reuse the established Rails models/services and maintain legacy compatibility.

Do not create a new database model or new booking engine merely to simplify frontend code.

Test booking writes only against the appropriate local or isolated staging environment.

---

# 18. Audio Narration, Pause Guide, and Play Guide

The narration must be coordinated with the current route and stop.

Required behavior:

- Play guide speaks the relevant current step.
- Pause guide stops or pauses narration and preserves the current progress.
- Resume continues from the correct current segment.
- Moving to the second half of a tour does not restart narration from the first stop.
- Advancing to the next stop uses that stop's narration.
- Navigating back to a prior stop behaves according to the existing guide semantics.
- Route replay does not unintentionally reset narration.
- Floor transitions do not associate speech with the wrong instruction.

Reuse existing text-to-speech or audio mechanisms.

Do not invent new narration content that contradicts the real route, stop, or property information.

If the app uses dynamically generated narration from current data, preserve that behavior. If CMS-managed media exists, connect it through the existing data sources.

Do not hardcode a single audio script for all units.

---

# 19. Settings and Other App Pages

Preserve the functionality and current navigation of the rest of the Self Tour App.

Where other pages are represented in the live design artifact, apply the relevant visual tweaks and styling refinements while keeping their existing functionality intact.

Do not broadly rewrite unrelated screens.

In particular:

- Do not redesign the entire app from scratch.
- Do not replace working map/route components.
- Do not alter unrelated authentication or profile behavior.
- Do not discard existing sheets or modal workflows.
- Do not remove the existing demo-scenario system if it is useful for design review.
- Do not allow demo scenarios to modify real property or tour data.
- Do not remove existing screens simply because the artifact depicts a different visual arrangement.

Keep unrelated functionality unchanged unless a shared component's visual correction is required by the design.

---

# 20. Demo Scenarios Versus Real Data

The app contains demo scenarios and has previously used dummy data.

Preserve demo functionality for UI review, but establish a clear distinction between demo mode and real-data operation.

### Real-data mode

Use the actual selected property's data for:

- Properties.
- Buildings and floors.
- Units and amenities.
- Tour Stops.
- SVG maps.
- Route geometry and instructions.
- Lock/provider metadata.
- Scheduling and booking.
- Access-method selection.
- CMS-managed media.

### Demo-only mode

Use isolated fixtures only when intentionally running a design/demo scenario.

Do not:

- Replace real properties with example values.
- Invent valid routes.
- Display fake access codes as real credentials.
- Display successful Bluetooth/cloud unlocking when no operation occurred.
- Show hardcoded booking slots in real mode.
- Mix demo units into the real stop list.
- Persist demo data into the production backend.

The `Demo · Method` variants in the design should help exercise the UI during design review. They must not silently override the actual lock method in the real tour.

Where the implementation has a demo scenario selector, ensure that it affects only demo mode and that the selected real property does not accidentally inherit the demo lock configuration.

---

# 21. API, Security, and State Management

Reuse the existing API client, repositories, state store, and service abstractions.

Inspect how the current app loads property data, stop data, routes, lock information, and booking settings.

Verify:

- Correct property scoping.
- Correct API response parsing.
- Correct loading states.
- Recoverable errors.
- Request cancellation where supported.
- No stale responses after property or floor changes.
- No accidental duplicate booking submissions.
- No duplicate stop additions.
- Correct state restoration when returning from a detail screen.
- No unnecessary network requests during map zoom or route animation.

### Security requirements

- Keep secret credentials out of the APK.
- Never display fake unlock success.
- Use the established authentication and authorization.
- Protect access codes and sensitive visitor data.
- Do not trigger live physical-lock operations during routine UI QA.
- Do not write to the production database as part of testing.
- Do not weaken native permissions or security policies to make a UI interaction appear to work.

---

# 22. Required Testing

Test the actual app, not only a browser mockup or a static build.

## A. Build Your Tour

Test:

- Loading real stops.
- Grouping by building/floor.
- Stop count and duration.
- Adding available stops.
- Removing a stop.
- Filtering units and amenities.
- Building/floor filtering.
- Unit preferences.
- Duplicate prevention.
- Empty results.
- Invalid or unavailable route.

## B. Map and route

Test:

- Existing map rendering.
- Floor dropdown.
- Floor switching.
- Maximize and restore.
- Zooming and panning.
- Locate selected unit/amenity.
- Correct SVG and floor.
- Route overlay alignment.
- Replay icon.
- Route animation.
- Avoid Stairs.
- Elevator transitions.
- Secured-floor unlock steps.
- Property switching.
- Correct error state when no valid route exists.

## C. Unit and amenity details

Test:

- Correct stop information.
- Actual inventory attributes.
- Generated About This Space.
- Photos.
- Video and 360-degree view where available.
- Notes/photo interactions.
- Floor-plan zoom.
- Location action.
- Lock/access UI.
- Skip to Next Stop.
- Missing media and optional fields.

## D. Unlock flows

Test each supported method represented by the actual data:

- Bluetooth/mobile key.
- PIN/keypad.
- Remote/cloud unlock.
- Gate/garage.
- Elevator reader/access.
- Unsupported integration.
- Expired code.
- Failed service request.
- Permission denied.
- No device or unavailable hardware.
- Alternate method when actually supported.
- Help/report and skip behavior.

Use safe test credentials and a local/audit environment for state-changing operations.

## E. Audio guide

Test:

- Play.
- Pause.
- Resume.
- Move to next step.
- Continue from the second half of a tour.
- Replay route.
- Change floor.
- Return from unit details.
- Prevent restarting from the first step unintentionally.

## F. Scheduling and Booking

Test:

- Load actual tour types.
- Load available dates and slots.
- Respect visiting hours.
- Respect scheduling rules.
- Render the appropriate form fields.
- Submit a valid booking in the isolated environment.
- Reject unavailable or invalid bookings.
- Show the booking result.
- Verify the created booking appears in the CMS Visitors module.

## G. Existing functionality

Regression-test:

- Authentication.
- Property selection.
- Tour construction.
- Real map rendering.
- Route generation.
- Existing lock/PIN/Bluetooth services.
- Current navigation.
- Other relevant app screens.

Run the available TypeScript checks, linting, unit tests, integration tests, and Android build.

Do not mark an unexecuted test as passed.

---

# 23. Representative Real-Property Validation

Use actual database-backed properties rather than relying exclusively on the design examples.

Prioritize:

- Hazel — known Igloo integration reference.
- John Demo — important map/routing case.
- Jennifer Demo FP — important SVG/map case.
- Relevant Alliance properties.
- Additional properties needed to cover lock methods, multi-floor routes, amenities, available units, and scheduling configurations.

Verify actual IDs and available capabilities.

For each property, record:

- Real property ID.
- Buildings and floors.
- SVG/map availability.
- Available Tour Stops.
- Unit and amenity data.
- Lock providers and methods.
- Route and graph availability.
- Scheduling configuration.
- Results of the supported test flows.

Do not assume every property has every provider or route type.

If a property has no valid connection or lacks a required integration, report that configuration accurately instead of creating fake data in production.

Use local or isolated staging data for all mutations.

---

# 24. Visual and Functional QA Against the Live Artifact

Create a design acceptance checklist from the live Claude artifact.

For every accessible screen or tweak, record:

- Design state inspected.
- Existing component.
- Required change.
- Implemented result.
- Functional behavior preserved.
- Validation result.

Perform screenshot comparisons where possible.

Pay attention to:

- Page spacing.
- Typography and hierarchy.
- Buttons and touch targets.
- Lock method presentation.
- Map controls.
- Stop detail layouts.
- Floor selectors.
- Route instructions.
- Media presentation.
- Modal and sheet layouts.
- Safe areas and scrolling.
- Loading and error states.

Do not claim pixel-perfect matching without comparing actual screenshots.

A design is not complete merely because its initial static state resembles the screenshot. All relevant variants and interaction transitions must also work.

---

# 25. Implementation Workflow

Proceed in the following order, implementing rather than stopping after analysis.

### Phase 1 — Discovery

- Read project documentation.
- Inspect the live Claude Design artifact and accessible tweaks.
- Inspect the current screens and components.
- Identify working logic to preserve.
- Verify the app's current map, route, unlock, and booking behavior.
- Create the dedicated branch safely.

### Phase 2 — Build Your Tour and Add Stops

- Implement the current design.
- Add the All Floors selector.
- Implement stop addition/removal.
- Implement search and filters.
- Keep the existing real-map rendering.

### Phase 3 — Map and Guided Navigation

- Add maximize/locate controls.
- Show the actual route overlay.
- Add the replay icon.
- Implement the Avoid Stairs preference.
- Verify elevator transitions and route instructions.
- Preserve existing routing and animation logic.

### Phase 4 — Stop Details and Unlock Variants

- Implement unit/amenity details.
- Use actual inventory data.
- Derive About This Space from actual data.
- Connect CMS-managed media where available.
- Integrate existing provider services into the correct unlock UI.
- Implement supported fallback, help, and skip interactions.

### Phase 5 — Audio Guide

- Correct the pause/resume behavior.
- Maintain the current instruction index.
- Prevent narration from restarting from the beginning when continuing a later segment.

### Phase 6 — Scheduling and Booking Integration

- Inspect the existing CMS backend implementation.
- Connect the current app flow to real availability, slots, and form configuration.
- Implement booking submission using the existing Rails business logic.
- Verify the booking appears in Visitors.

### Phase 7 — Regression and polish

- Apply relevant visual tweaks to other screens.
- Run design and functional tests.
- Correct defects.
- Verify the existing map, route, and lock behavior.
- Update documentation and report actual outcomes.

Do not stop at the discovery plan unless a real external dependency or critical ambiguity prevents further work.

---

# 26. Documentation Updates

Append dated updates to the relevant existing documents, preserving historical information.

Update applicable files, including:

```text
context.md
PYN_CONNECT_PROGRESS.md
tour-app-implementation.md
tour-app-backend-api.md
tour-app-design-refresh-report.md
tour-app-igloo-integration.md
tour-app-igloo-bluetooth.md
```

Document:

- Live design states and tweaks reviewed.
- Screens and interactions implemented.
- Map and route controls added.
- Audio-guide state behavior.
- Supported unlock methods.
- Scheduling/Booking integration changes.
- APIs and services reused.
- Any required new API work.
- Automated and manual test results.
- Real-property coverage.
- Remaining limitations.

Do not overwrite existing history or report simulated results as real integration successes.

---

# 27. Final QA Report

Create or update an appropriate report, for example:

```text
SELF_TOUR_START_EXPERIENCE_QA.md
```

Include:

## Scope and branch

- Feature branch.
- Base branch.
- Existing functionality preserved.

## Design coverage

- Screens inspected.
- Tweaks and selectable variants covered.
- Visual comparison results.
- Remaining inaccessible design states.

## Build Your Tour

- Stop list.
- Add/Remove.
- Filters.
- Summary and route consistency.

## Map and Navigation

- Existing map preservation.
- All Floors selector.
- Maximize/locate/zoom.
- Route overlay.
- Replay icon.
- Avoid Stairs.
- Elevator access.
- Audio-guide state.

## Unit and Amenity Details

- Real data.
- About This Space.
- Media.
- Photos and notes.
- Lock/access UI.

## Unlock Integration

- Bluetooth/mobile key.
- PIN/keypad.
- Remote unlock.
- Gate/garage.
- Other supported methods.
- Tests that require unavailable hardware.

## Scheduling and Booking

- Real CMS configuration.
- Tour types and slots.
- Visiting hours.
- Booking Form.
- Booking submission.
- CMS Visitors verification.

## Regression

- Existing routes and maps.
- Current app functionality.
- Other screen behavior.
- API and state correctness.

## Test results

Use `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`. Include evidence for each status.

## Remaining work

List genuine defects, unsupported providers, inaccessible hardware, and any unverified requirements.

---

# 28. Final Acceptance Criteria

The task is complete when:

1. The live Claude Design artifact and all accessible relevant tweaks have been inspected.
2. The new Start Tour experience is implemented in the actual Capacitor app.
3. Existing application functionality and working map rendering are preserved.
4. The map displays the actual selected floor and real route geometry.
5. All Floors, maximize, locate/zoom, and route replay behave correctly.
6. Avoid Stairs uses the supported step-free/elevator routing behavior.
7. Play/Pause guide maintains the correct current narration step.
8. Unit and amenity details use actual data and correct content sources.
9. Add Stops retrieves real eligible stops, supports filters, and prevents duplicates.
10. Unlock UI is selected from the actual configured provider and access method.
11. Existing PIN, Bluetooth, remote unlock, and gate services are reused appropriately.
12. Scheduling and Booking use real CMS-backed configuration where applicable.
13. Valid bookings can be created in a safe environment and are visible in the CMS.
14. Demo scenarios remain separate from real operational data.
15. Unrelated app functionality remains intact.
16. Relevant automated and visual tests have been executed and documented.
17. Project documentation is updated.
18. Production data has not been modified by the testing process.

---

# FINAL INSTRUCTION

Begin by understanding the existing Capacitor app, the current backend contracts, and the live Claude Design artifact.

**Keep the working map and existing business logic. Improve the Start Tour experience around them.**

Implement the complete Build Your Tour and Add Stops experience, map and route controls, unit/amenity details, unlock variants, elevator navigation, and correctly synchronized audio guide. Connect the existing Schedule Self-Tour flow to the CMS's actual Scheduling and Booking configuration rather than leaving those flows backed by dummy data.

Use existing Rails services and endpoints wherever possible, introduce only the minimum compatible backend/API changes that are genuinely required, and perform all write tests against local or isolated staging data.

Apply relevant design refinements to other screens without rewriting unrelated behavior.

If a required design state is inaccessible, an essential API is genuinely missing, or an actual integration prerequisite cannot be established from the code, ask me a precise question describing the blocker and why it matters. Otherwise, proceed through implementation, testing, and documentation.

**Do not declare completion because the screens look correct. The design tweaks, existing map and route behavior, access methods, and relevant scheduling/booking flows must all behave correctly in the actual application.**