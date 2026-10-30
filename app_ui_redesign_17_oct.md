# PYNWHEEL SELF TOUR APP — COMPLETE UI REDESIGN FROM CLAUDE DESIGN, PRESERVE EXISTING FUNCTIONALITY, NO NEW APIs

## 1. Objective

Implement the new Pynwheel Self Tour App design in the existing Capacitor application using the following Claude Design reference:

**Design reference:**
https://claude.ai/design/p/13d18a36-ed41-492e-b118-e69e26e4636a?via=share&file=Pynwheel+Self+Tour+App.dc.html

Design file: `Pynwheel Self Tour App.dc.html`

The new design includes multiple tweaks and iterations in the Claude Design artifact. Do not inspect only the initial screen or implement only the most obvious visual changes. Thoroughly review the available design variations, revised screens, interaction states, and behavior changes represented throughout the artifact.

Implement the complete applicable design in the existing Capacitor Self Tour App while preserving all currently working functionality.

**For this phase, the task is strictly frontend/UI implementation. Do not implement new APIs, backend functionality, business logic, or database changes.**

The primary goal is to make the existing application look and behave according to the new design, including all relevant UI variations and interactions, without breaking the current tour experience.

A separate Claude session is working on the Pynwheel Connect CMS. Keep this task isolated to the Self Tour App. Do not interfere with the CMS implementation or overwrite work being performed by that session.

---

# 2. CRITICAL SCOPE — SELF TOUR APP ONLY

This task concerns the **new Capacitor Self Tour App**, not the Pynwheel Connect CMS.

### In scope

* Implementing the new Self Tour App visual design.
* Updating existing mobile screens and layouts.
* Adding UI components and screens represented in the design.
* Implementing UI state changes corresponding to the design tweaks.
* Improving responsive layouts and mobile interactions.
* Reusing images and assets from the existing Pynwheel application.
* Preserving existing navigation, API integration, map rendering, and tour functionality.
* Using local demo data or local component state for genuinely new UI capabilities that have no existing implementation.
* Updating relevant Self Tour App documentation.
* Building and validating the existing application after the UI changes.

### Strictly out of scope

* Pynwheel Connect CMS page redesigns.
* Rails backend changes.
* FastAPI or other backend changes.
* New API endpoints.
* Changes to existing API contracts.
* New database tables, columns, relationships, or migrations.
* New business logic.
* New persistent settings or backend-backed workflows.
* Changes to existing route-generation algorithms.
* Changes to graph persistence or map data.
* Changes to Igloo, Bluetooth, or other integration business logic.
* Unrelated backend or legacy application refactoring.

Do not use this task to solve unrelated issues found during implementation. Record such issues separately if they block the UI work.

**This is a UI redesign of the existing Self Tour App, not a product rewrite.**

---

# 3. Create a Separate Branch From `main`

Create a dedicated branch for the Self Tour App redesign.

Suggested branch name:

```text
feature/self-tour-app-design-refresh
```

The branch must be based on the current `main` branch.

Another Claude session is working on the CMS, so branch and working-tree isolation is particularly important.

### Before creating the branch

1. Locate the Git repository containing the Capacitor Self Tour App.
2. Inspect the current branch, Git status, and recent relevant commits.
3. Identify any uncommitted changes.
4. Determine whether the CMS Claude session is working in the same repository or working directory.
5. Preserve all user changes and avoid interfering with the CMS session.

### Branch isolation requirements

If the CMS session shares the same Git working directory, **do not switch branches in that shared working tree**. Use a separate Git worktree or isolated working copy for this task.

Create the new branch from the latest appropriate local `main`. If the latest `main` is not available locally, determine whether fetching it is safe before proceeding.

Do not reset, clean, stash, overwrite, or discard another session's work.

Do not automatically merge, rebase onto, cherry-pick from, or push changes from the CMS branch.

The purpose is to maintain two independent streams of work:

```text
                    main
                     |
          +----------+----------+
          |                     |
          v                     v
CMS feature work       Self Tour App design
Claude session         feature/self-tour-app-design-refresh
          |                     |
          v                     v
CMS implementation     Capacitor UI implementation
```

Keep changes isolated to the Self Tour App and its directly relevant UI assets, tests, and documentation.

If the application's structure forces a change to a shared component or global stylesheet, first establish whether it affects the CMS. Prefer app-specific styles and components to prevent unintended cross-application changes.

Do not commit or push automatically unless the repository's established workflow explicitly requires it.

---

# 4. Read the Existing Project Documentation First

Before coding, understand the application's current implementation and project history.

Read the latest applicable versions of:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
tour-app-implementation.md
tour-app-backend-api.md
```

Locate the actual files and directories rather than assuming that every document exists at the repository root.

Read any other relevant documentation covering:

* Capacitor architecture.
* Mobile navigation and screen composition.
* Existing Self Tour App functionality.
* Tour-building workflow.
* Property and stop selection.
* Map and SVG rendering.
* Route generation and route instructions.
* Play Route animation.
* Floor transitions.
* Existing app themes and design conventions.
* Asset and image handling.
* Android and iOS configuration.
* Previous design changes and known issues.

Use the current code to establish which features actually work.

The documentation provides context, but it must not substitute for inspecting the current implementation.

Before making changes, record the relevant existing screens, components, assets, navigation paths, and API integrations.

---

# 5. Thoroughly Inspect the Entire Claude Design Artifact

This is one of the most important requirements.

Reference:

https://claude.ai/design/p/13d18a36-ed41-492e-b118-e69e26e4636a?via=share&file=Pynwheel+Self+Tour+App.dc.html

You must understand the complete available design, including its iterations and tweaks.

**Do not implement just the design visible in the first screen or treat the supplied HTML filename as the complete specification.**

### 5.1 Review every relevant screen

Inspect all available screens and states relevant to the Self Tour App, including those introduced or modified during the design process.

Record the actual screens, components, and flows represented in the artifact.

Depending on what the design contains, these may include:

* Welcome or landing screens.
* Authentication screens.
* Property selection.
* Building or floor selection.
* Build Your Tour.
* Stop selection.
* Route preview.
* Map and SVG presentation.
* Route instructions.
* Play Route.
* Current position or destination states.
* Floor transitions.
* Modals and bottom sheets.
* Loading and error states.
* Empty states.
* Confirmation and success states.
* Settings or other existing Self Tour App views.

This is an inspection checklist, not permission to invent screens that are absent from the design or unnecessary for the existing product.

### 5.2 Review all design tweaks and iterations

For each relevant change in the Claude Design artifact, establish:

* What changed visually.
* Which screen or component it affects.
* Whether layout or navigation changed.
* Whether a new interaction was introduced.
* Whether an existing interaction changed.
* Whether a new UI state is required.
* Whether the change affects mobile responsiveness.
* Whether the change can be implemented without changing backend behavior.

Create a design implementation checklist from these findings.

Do not ignore a tweak simply because the original design was already implemented in the current app.

### 5.3 Inspect behavior, not only appearance

If the artifact includes interactive behavior, examine the relevant states and variations to determine how the UI should change when the user interacts with it.

Examples include:

* Selecting a property.
* Selecting or deselecting a tour stop.
* Opening and closing a modal.
* Switching floors.
* Moving from a stop-selection screen to route preview.
* Starting or stopping playback.
* Showing a validation message.
* Displaying an unavailable state.
* Handling an empty list.

Implement the UI state transitions represented by the design without inventing a new backend workflow.

### 5.4 Resolve access limitations honestly

If the Claude Design link does not expose some iterations, screenshots, or interactions, use any available exported design file or local reference asset.

If a specific important tweak cannot be inspected, identify the missing design state and ask me for the relevant screenshot or export when it materially blocks correct implementation.

Do not claim to have inspected inaccessible versions.

---

# 6. Inspect the Current Capacitor App Before Redesigning It

Locate the actual Self Tour App directory and examine the current implementation.

Inspect:

* App entry point and navigation.
* Existing page and screen components.
* Layout and shared UI components.
* Styling and theme definitions.
* Icons and image assets.
* API client and repository code.
* Existing data models and TypeScript types.
* Authentication and session state.
* Property and stop selection.
* Route generation and route rendering.
* SVG map rendering.
* Play Route state and animation.
* Floor and building transitions.
* Loading, error, and empty states.
* Capacitor configuration.
* Existing Android and iOS build setup.
* Relevant tests.

Determine which existing components should be restyled and which genuinely need a new UI component.

Prefer adapting and reusing working components over replacing them with entirely new implementations.

Avoid maintaining two independent versions of the same screen or control.

---

# 7. Implement the New Design Without Breaking Existing Functionality

The new design must be integrated into the actual application, not created as a disconnected collection of static HTML screens.

Preserve the existing working functionality and adapt its presentation to the new design.

### Core rule

```text
Existing working functionality
           +
New UI design
           +
Required visual state transitions
           =
Redesigned Self Tour App
```

Do not use this approach:

```text
Existing working application
           ↓
Replace with static mockup
           ↓
Lose existing functionality
```

### Preserve existing functionality

Where already implemented, keep working:

* Login and logout.
* Authentication and session handling.
* Property selection.
* Build Your Tour.
* Real stop data.
* Stop-selection behavior.
* Route generation.
* Shortest-path results.
* SVG and map rendering.
* Route instructions.
* Play Route.
* Floor and building transitions.
* Existing error handling.
* Existing API requests and data repositories.

Do not remove a working feature simply because its current implementation differs from the new visual design.

Do not replace a real map with a screenshot, a static image, or a mockup.

Do not replace actual route data with fabricated route geometry.

If a screen already has correct behavior but its layout differs from the new design, update the presentation layer first.

---

# 8. Use the Original Pynwheel Images and Assets

The existing Pynwheel application contains image assets that are better suited to the product than some of the images embedded in the Claude Design artifact.

**Use the original assets from the existing Pynwheel application wherever appropriate. Do not automatically use lower-quality or unsuitable artifact images as the source of truth.**

### 8.1 Find the original assets

Search the existing project and legacy application for the relevant:

* Property images.
* Building images.
* Floorplan previews.
* Map or floorplate previews.
* Icons.
* Illustrations.
* Brand assets.
* Loading animations.
* Other images referenced by the existing Self Tour App.

Inspect the actual assets and their original quality before selecting them.

Use the existing project documentation and source code to identify their intended usage.

### 8.2 Asset selection requirements

Prefer assets that:

* Match the design's subject and purpose.
* Have sufficient resolution.
* Preserve the original aspect ratio.
* Use the best available source format.
* Remain sharp on mobile screens.
* Are stored locally in the project when appropriate.
* Follow the existing asset-loading conventions.

Avoid:

* Stretching images.
* Using tiny thumbnails for large visual areas.
* Converting assets to a lower-quality format unnecessarily.
* Downloading duplicate copies when an appropriate original already exists.
* Referring to temporary paths outside the app bundle.
* Depending on fragile local filesystem paths at runtime.

Where a source image needs a different display size, use appropriate layout and image-fitting behavior rather than distorting the source.

Keep SVG assets as SVG when suitable. Keep transparency when required and preserve the image's original visual integrity.

### 8.3 Do not invent replacement images

When an existing Pynwheel asset matches the design, reuse it.

When no suitable original asset exists, first inspect the artifact and other existing project resources. Use the closest supported existing asset only when appropriate, without pretending it represents a real property or floor.

Do not generate arbitrary map imagery or hardcode fake property assets.

---

# 9. Build a Module-by-Module Implementation Plan

Before making substantial changes, create a concise internal checklist that maps the design to the current application's screens and components.

For each module, document:

| Module                   | Current implementation | Design changes                       | New UI states                           | Existing behavior to preserve |
| ------------------------ | ---------------------- | ------------------------------------ | --------------------------------------- | ----------------------------- |
| App shell and navigation | Inspect code           | Apply new design                     | Based on artifact                       | Existing routing              |
| Authentication           | Inspect code           | Restyle applicable screens           | Based on artifact                       | Existing session/API flow     |
| Property selection       | Inspect code           | Apply new layouts                    | Selected/loading/empty states as needed | Real property data            |
| Build Your Tour          | Inspect code           | Apply updated design                 | Selection and validation states         | Existing stop-selection logic |
| Map and route            | Inspect code           | Apply map/route presentation changes | Route/loading/error states              | Real SVG, graph, and route    |
| Play Route               | Inspect code           | Update relevant controls             | Playback states                         | Existing animation behavior   |
| Other designed screens   | Inspect artifact       | Follow reference                     | Follow reference                        | Existing functionality        |

The actual rows must reflect the artifact and codebase.

Do not stop after creating this checklist. Use it to implement and verify the UI.

---

# 10. Apply the Design System Consistently

Implement the new visual language throughout the applicable Self Tour App screens.

Inspect the reference for the correct:

* Colors.
* Typography.
* Spacing.
* Component sizes.
* Border radii.
* Shadows.
* Backgrounds.
* Buttons.
* Inputs.
* Cards.
* Icons.
* Navigation elements.
* Modals and sheets.
* Selected and disabled states.
* Loading indicators.
* Empty and error states.

Use shared frontend components and design tokens where appropriate.

Avoid one-off implementations that make similar screens look inconsistent.

If the current app already has a theme or component library, adapt it where feasible instead of introducing an unnecessary second design system.

Keep any global styling changes isolated to the Self Tour App when possible. Another Claude session is working on the CMS, so avoid styling changes that unintentionally alter CMS pages or shared application chrome.

Do not introduce a large UI framework solely to reproduce the design when the current stack can achieve the same result.

---

# 11. Implement UI Interactions for Every Relevant Design Tweak

The UI must support the interactions shown in the artifact, not just reproduce its static appearance.

For every relevant screen, identify the interactive controls and implement their supported UI behavior.

Examples may include:

* Navigation between screens.
* Selection cards.
* Buttons and action menus.
* Tabs and segmented controls.
* Search and local filtering.
* Selecting and removing stops.
* Opening and closing sheets.
* Expanding and collapsing sections.
* Selecting a building or floor.
* Loading and error presentation.
* Empty-state actions.
* Playback controls.
* Route-preview transitions.
* Confirmation dialogs.
* Validation and status feedback.

Only implement interactions that are part of the actual design or necessary to maintain existing functionality.

### State handling

Ensure:

* The selected item is visibly selected.
* Controls update consistently.
* Disabled actions appear and behave correctly.
* Loading states are recoverable.
* Modals and sheets can be opened and dismissed.
* Navigation preserves appropriate state.
* State does not leak between unrelated screens or properties.
* Rapid interaction does not leave the UI in an inconsistent state.

For an existing feature, use the existing functional handler wherever possible.

For a new UI-only feature without backend support, use local component state or isolated demonstration data.

Do not add a backend implementation to make a new design tweak work.

---

# 12. New UI Features Must Remain Frontend-Only

Some design tweaks may introduce UI controls or flows that do not exist in the current app.

Implement their visual representation and appropriate local UI interactions, but do not introduce new backend functionality.

### Existing functionality

Where the current application already has a functional implementation, preserve it and use its existing data flow.

Examples include real properties, actual stops, SVG maps, routes, and established tour operations.

### New UI-only functionality

For features that genuinely do not exist:

* Use isolated local state.
* Use representative demo data only where necessary.
* Keep demo fixtures separate from real API data.
* Avoid mixing mock values into real property or tour data.
* Do not introduce new API calls.
* Do not persist new settings to the database.
* Do not create fake successful API responses.
* Do not claim a change has been saved to the backend.
* Do not simulate a real physical operation as though it occurred.

For example, a newly designed visual preference control may update a local preview state, but must not claim to change a server-side user preference.

If an action requires a backend operation that does not currently exist, leave it as an appropriate UI-only interaction or visibly unavailable action according to the design.

Do not let a demo implementation overwrite real state.

---

# 13. Protect Maps, SVGs, and Route Behavior

The map and route components are particularly sensitive because the Self Tour App already contains real data integration and route functionality.

The redesign must not inadvertently regress them.

Where these features exist, verify:

* The actual selected floor's SVG remains visible.
* The correct floor and property assets are displayed.
* Existing SVG rendering is preserved.
* Stop markers align with the map.
* Route geometry remains aligned.
* Route data is not replaced by demo paths.
* Zoom and other supported controls continue working.
* Switching floors does not retain an obsolete map.
* Route instructions continue using real route data.
* Playback controls continue invoking the current route simulation.
* Loading and failure states remain functional.

If the new design changes the appearance of map controls or route panels, modify the presentation while preserving the established functionality.

Do not rewrite the routing engine or map repository as part of a UI redesign.

---

# 14. Responsive Layout and Mobile Experience

The application must look and behave correctly on the mobile devices supported by the current Capacitor project.

Inspect the design at all available viewport sizes and identify the corresponding responsive changes.

Pay attention to:

* Safe areas and device insets.
* Keyboard appearance.
* Bottom sheets and modals.
* Fixed and sticky controls.
* Long property and stop names.
* Scrollable content.
* Small-screen buttons.
* Content overflow.
* Map viewport sizing.
* Tab and navigation transitions.
* Device orientation where relevant.
* Touch target sizes.

Preserve native-feeling interactions supported by the existing app.

Do not introduce layout assumptions that work only in desktop browser previews.

If the design artifact includes a different layout for smaller screens, implement that behavior rather than simply shrinking the desktop layout.

---

# 15. Performance and Maintainability

The visual redesign must not make the existing app unnecessarily slower.

Avoid:

* Duplicating expensive map components.
* Reconstructing the SVG on every unrelated state change.
* Unnecessary React rerenders.
* Repeated loading of the same local asset.
* Excessive component remounting.
* Duplicated screen implementations.
* Unnecessary new dependencies.
* Creating a second source of truth for the same UI state.

Reuse existing components and API clients where possible.

Do not add new API requests for UI-only design elements.

Where existing data-loading behavior is already functional, preserve it unless a frontend-only adjustment is necessary to support the new UI.

Do not broaden this task into a general performance refactor.

---

# 16. Testing and Visual Verification

A successful implementation requires more than a successful build.

### 16.1 Compare against the design artifact

Review each applicable screen and compare the implemented result with the actual design reference.

Check:

* Layout and hierarchy.
* Spacing and proportions.
* Typography.
* Color and component styling.
* Images and icons.
* Selected and disabled states.
* Modals and sheets.
* Empty, loading, and error states.
* Responsive behavior.
* The behavior of the design tweaks.

If browser screenshots or device screenshots are available, capture the relevant screens and compare them with the reference.

Do not claim pixel-perfect parity without performing a visual comparison.

### 16.2 Existing functionality regression tests

Test the affected existing workflows, including where supported:

* Authentication.
* Property selection.
* Building/floor selection.
* Stop selection.
* Tour creation.
* Map and SVG rendering.
* Route generation.
* Route instructions.
* Play Route.
* Floor transitions.
* Navigation away from and back to tour screens.

Verify that the redesign still consumes actual backend data for existing features.

### 16.3 UI interaction tests

Test the new design states and interactions.

Check:

* Navigation controls.
* Buttons and selection behavior.
* Modal/sheet lifecycle.
* Filter and tab behavior.
* Local demo interactions.
* Disabled states.
* Error recovery.
* Responsive layout.
* Preservation of selections where expected.

### 16.4 Automated validation

Run the existing:

* Lint checks.
* TypeScript checks.
* Unit tests.
* Integration tests.
* Relevant builds.

Add tests for newly implemented UI behavior using the current testing framework.

Do not report unexecuted tests as passed.

---

# 17. Documentation Updates

Read the existing documentation conventions and update the relevant Self Tour App documents.

Append dated entries to the applicable existing files, such as:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
tour-app-implementation.md
```

Use the correct paths and update only relevant documents.

Document:

* The design reference used.
* The available design variations and tweaks reviewed.
* Screens and components updated.
* Existing functionality preserved.
* Original Pynwheel image assets reused.
* New UI-only states and their local behavior.
* Backend/API functionality explicitly left unchanged.
* Tests actually performed.
* Any design states that remain unimplemented because the artifact or required assets were unavailable.
* Remaining UI gaps.

Do not overwrite project history or introduce unnecessary duplicate documents.

Do not mark a visual or functional requirement as complete without verifying it.

---

# 18. Git and CMS Collaboration Safeguards

Because a separate Claude session is implementing the CMS design, isolate this task carefully.

Before completion:

1. Verify the work remains on `feature/self-tour-app-design-refresh`.
2. Verify the branch is based on `main`.
3. Inspect the final diff.
4. Ensure the modifications concern the Self Tour App only, apart from necessary app-specific assets, tests, and documentation.
5. Check for unintended changes to global styles or shared components.
6. Confirm no backend/API or database changes were introduced.
7. Ensure no CMS work from the other Claude session was overwritten.
8. Preserve unrelated files and uncommitted changes.
9. Review the final working-tree status.

Do not merge the CMS session's branch, copy its in-progress changes, push, or create a commit unless explicitly instructed or required by the established workflow.

If a shared component must be changed, explain why the change is necessary and verify its impact on the CMS.

---

# 19. Final Deliverables

At the end, provide:

### A. Design Coverage

List the actual design screens and tweaks implemented. Include any states that could not be accessed or reproduced.

### B. Self Tour App Changes

Summarize the updated screens, components, theme, and responsive behavior.

### C. Original Assets Reused

List the important images or assets reused from the original Pynwheel application and their source paths.

### D. Existing Functionality Preserved

Describe how the existing property, tour, map, SVG, routing, and playback functionality was retained.

### E. UI-Only Additions

List new visual states or interactions that use local state or demonstration data and confirm that no new backend persistence was added.

### F. Testing

Report the actual lint, type-check, test, build, and visual-validation results.

### G. Git Status

Provide the feature branch name, base branch, working-tree status, and a concise summary of changed files.

### H. Remaining Issues

Document any inaccessible design states, missing original assets, UI gaps, or issues that could not be verified.

---

# 20. Final Acceptance Criteria

The task is complete when:

1. A dedicated branch has been created from `main` without disrupting the CMS Claude session.
2. The actual Self Tour App design artifact has been examined thoroughly.
3. All accessible and applicable design tweaks have been implemented.
4. The new design has been applied throughout the relevant existing Capacitor screens.
5. Original Pynwheel images and assets have been reused wherever suitable.
6. Existing working code, navigation, map rendering, route generation, and tour functionality remain intact.
7. New design-only features work through appropriate local UI interactions.
8. No new APIs, backend behavior, or database changes have been introduced.
9. The app remains usable on supported mobile viewport sizes.
10. Automated and visual checks have been performed and reported honestly.
11. Relevant documentation has been updated.
12. Unrelated CMS work and existing user changes have been preserved.

---

# FINAL INSTRUCTION

Start by understanding the current Self Tour App architecture and its project documentation. Create an isolated branch from `main`, inspect the complete `Pynwheel Self Tour App.dc.html` design, and review every relevant tweak and interaction state in the Claude Design artifact.

Then implement the new UI directly in the existing Capacitor app.

**The design reference defines the new visual experience. The current application defines the existing functional behavior. The original Pynwheel assets provide the preferred image sources.**

Preserve all working functionality, implement every applicable design tweak, use local UI state only for genuinely new features, and keep backend/API work out of scope.

Another Claude session is working on the CMS. Keep your changes isolated to the Self Tour App and ensure the two efforts do not overwrite or disrupt each other.

Do not finish with a static mockup, an incomplete screenshot recreation, or a report of intended changes. Implement the design in the actual app, validate the visual states and existing workflows, update the documentation, and report exactly what has been completed.
