# PYNWHEEL CONNECT — IMPLEMENT THE NEW CMS DESIGN (FRONTEND ONLY, NO BACKEND OR DATABASE CHANGES)

## 1. Objective

We have a new design for the Pynwheel Connect CMS in the following Claude Design project:

**Design reference:**
https://claude.ai/design/p/13d18a36-ed41-492e-b118-e69e26e4636a?via=share&file=Pynwheel+Admin+-+Back+Office.dc.html

Design file: `Pynwheel Admin - Back Office.dc.html`

Your task is to inspect the complete design, understand the existing Pynwheel Connect codebase, and implement the new design in the current application.

For this phase, focus on **frontend implementation, visual consistency, layout, navigation, and integration with existing read-only data**.

Some sections and capabilities in the new design may not exist in the current application. Implement their UI using clearly separated demo data until the actual data sources and functionality are defined in a future phase.

**Do not modify the backend, database schema, business logic, or existing backend APIs.**

---

## 2. Strict Scope and Non-Negotiable Rules

This task is primarily a Next.js/frontend implementation.

### Allowed

* Implement the new UI and page layouts.
* Update existing React/Next.js components and frontend styling.
* Add reusable frontend-only components.
* Improve existing frontend navigation and responsive behavior.
* Use existing backend read APIs to display actual data.
* Create isolated demo fixtures for new design elements without real data sources.
* Add local-only, non-persistent interactions for prototype functionality where appropriate.
* Improve frontend loading, error, empty, and responsive states.
* Refactor frontend code when needed to implement the design safely.

### Not allowed

* Modify Rails/Ruby backend code.
* Change Rails controllers, models, services, routes, serializers, or API contracts.
* Add or modify backend endpoints.
* Change database schemas, tables, columns, relationships, or migrations.
* Add new business logic or change existing business rules.
* Perform database writes or schema changes.
* Introduce new server-side persistence for demo features.
* Modify authentication or authorization rules.
* Replace real database-backed information with hardcoded demo values.
* Break existing functionality simply to match a visual design.
* Add large, unnecessary dependencies when the existing frontend stack can support the implementation.

**Important:** Continue using the existing backend read APIs for information that already exists in the database. For genuinely new sections without an existing data source, use demo data only.

Any new interaction that would require a backend change or data mutation must remain a non-persistent demo interaction or an appropriately disabled/clearly indicated action. Do not simulate a successful database save.

---

## 3. Understand the Existing Project Before Making Changes

Before coding, read the latest versions of the relevant project documentation.

Start with:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
```

Locate the actual progress document and file locations rather than assuming all documents are in the repository root.

Also review the existing documentation for:

* Next.js architecture;
* authentication and access control;
* Companies and Properties;
* Inventory and Property Details;
* Units, Floorplans, Floorplates, and Amenities;
* Map & Plotting;
* existing frontend API clients and repositories;
* current design system and styling conventions;
* previously completed migration work and known issues.

Inspect the current Git branch and working tree. Preserve existing user changes and do not overwrite unrelated work.

Understand the existing architecture and constraints before making changes.

---

## 4. Inspect and Understand the Complete Design Reference

Access the supplied Claude Design project and inspect the actual design document, including `Pynwheel Admin - Back Office.dc.html`.

Do not rely only on the project's title, a single screenshot, or a superficial visual inspection.

Review all relevant available screens, sections, navigation items, page layouts, dialogs, tables, cards, sidebars, headers, and responsive states.

Extract the design's:

* overall layout and page structure;
* sidebar and navigation behavior;
* header and user-profile placement;
* typography and font hierarchy;
* color palette and visual hierarchy;
* backgrounds, borders, shadows, spacing, and radii;
* table and list styling;
* card and summary layouts;
* filter, search, and toolbar placement;
* icons and image treatments;
* buttons, dropdowns, modals, and overlays;
* empty, loading, and error states;
* desktop and mobile responsive behavior.

Identify which parts of the design correspond to existing Pynwheel Connect screens and which represent new UI additions.

If the provided design link is inaccessible, inspect whether the HTML design file is available locally or can be accessed through the project's existing files. If the reference itself cannot be retrieved, report that specific blocker and request the exported design file rather than inventing design details.

**The supplied design is the visual source of truth. The existing application is the functional and data source of truth.**

---

## 5. Map the Design to the Existing Application

Before making broad changes, create an implementation map that connects the design to the existing Next.js application.

For each screen or major design section, identify:

| Design section      | Existing page/component    | Real data available?       | Implementation approach                          |
| ------------------- | -------------------------- | -------------------------- | ------------------------------------------------ |
| Sidebar/navigation  | Inspect current code       | Existing routes            | Implement the new design                         |
| Header/profile      | Inspect current code       | Existing session/user data | Reuse existing data                              |
| Companies           | Inspect current code       | Existing backend read API  | Display real data                                |
| Properties          | Inspect current code       | Existing backend read API  | Display real data                                |
| Inventory           | Inspect current code       | Existing backend read API  | Display real data                                |
| New dashboard/cards | Verify source availability | Possibly unavailable       | Use isolated demo data                           |
| New sections        | Verify source availability | Possibly unavailable       | Use isolated demo data                           |
| New charts/metrics  | Verify source availability | Possibly unavailable       | Use demo data unless existing data supports them |

This table is illustrative. Determine the actual pages, components, and data sources from the supplied design and current codebase.

Classify every important design element as one of the following:

* **Existing functionality:** Reuse and restyle the current implementation.
* **Existing real data:** Continue reading it through the existing API.
* **New UI with no data source:** Implement with isolated demo data.
* **New interaction requiring backend functionality:** Implement a non-persistent frontend prototype or leave the action clearly unavailable.
* **Unclear design requirement:** Resolve it by examining the design and existing product conventions before making assumptions.

Do not create duplicate pages or components when existing components can be adapted.

---

## 6. Match the Design Accurately

The goal is not merely to make the application look generally similar. Implement the actual visual system represented in the supplied design.

Pay attention to details such as:

* sidebar width and active-navigation states;
* header height and alignment;
* content margins and maximum widths;
* section spacing;
* card sizes and grid ratios;
* table row heights and column alignment;
* typography size, weight, and contrast;
* button dimensions and hierarchy;
* input and search styling;
* icons and alignment;
* modal placement and dimensions;
* scrolling behavior;
* responsive breakpoints;
* hover, focus, and selected states.

Inspect existing styles and component libraries before adding new styling conventions.

Prefer a consistent set of reusable frontend design tokens and components for repeated patterns such as buttons, inputs, cards, tables, badges, and section headers.

Avoid introducing multiple competing implementations of the same UI element.

Do not replace existing functionality with static HTML simply to make a screenshot look accurate.

---

## 7. Preserve Existing Navigation and Functionality

Implement the new visual design without breaking existing Pynwheel Connect workflows.

Inspect the current route structure and navigation, and preserve the existing functionality of the relevant pages.

Where applicable, verify:

* Login and logout;
* Companies listing and navigation;
* Properties listing and navigation;
* property details;
* Inventory;
* Units;
* Floorplans;
* Floorplates;
* Amenities;
* Map & Plotting;
* existing search, filter, sorting, and pagination;
* existing detail views and modals.

Do not assume every screen in this list must be redesigned if it is not part of the supplied design. Use the reference design to determine scope.

When redesigning a page, reuse its existing data-fetching and action logic wherever possible. Prefer changing the presentation layer over replacing working integrations.

If the new navigation references a page that does not currently exist, implement the appropriate frontend shell or demo view only when it is required by the supplied design.

Do not invent backend functionality to make a new menu item appear operational.

---

## 8. Use Real Data for Existing Features and Demo Data for New Additions

This distinction is critical.

### Existing functionality

For existing features, continue using the actual data returned by the current backend and database through the existing read APIs.

Examples include:

* company names;
* property names and identifiers;
* existing inventory counts;
* units and floorplans;
* floorplates and amenities;
* existing user/profile information available to the current application.

Do not replace real data with hardcoded values merely because the new design contains sample content.

Preserve existing API response types and frontend data models unless a frontend-only adapter is necessary.

### New design additions

When a new section, card, chart, metric, table, or component has no corresponding data source in the current application, use representative demo data for this phase.

Examples might include newly designed dashboard summaries, analytics cards, new visual reporting sections, or other elements that do not have an existing backend data source.

These examples are illustrative. Confirm which additions actually appear in the supplied design.

Requirements for demo data:

* Store it separately from production-backed API data.
* Use clear, descriptive names for demo fixtures.
* Make it easy to replace with actual API data in a future phase.
* Do not persist demo changes.
* Do not mix demo records into real property, company, unit, or inventory collections in a way that makes them appear to be real database records.
* Clearly distinguish demo-only values wherever ambiguity could mislead users.
* Keep demo data out of existing functionality that already has a reliable real-data source.

Create a simple frontend data abstraction where useful so a new section can later switch from demo data to a genuine API source without rewriting the entire UI.

**Do not introduce a new backend API just to supply data for a newly designed section.**

---

## 9. Build Reusable Frontend Components

Implement the design in a maintainable way using the project's current Next.js and React architecture.

Where appropriate, introduce or reuse components for:

* application shell;
* sidebar and navigation;
* header and user menu;
* page title and breadcrumbs;
* summary cards;
* data tables;
* search and filter controls;
* status indicators;
* tabs;
* modal dialogs;
* empty states;
* loading states;
* error states;
* demo charts and data visualizations.

Avoid:

* duplicating the full application shell across pages;
* creating different table components with inconsistent styling;
* placing large amounts of page logic inside a single component;
* adding unnecessary state libraries;
* introducing duplicate API clients;
* maintaining separate hardcoded and real-data implementations of the same existing feature.

Keep components typed and consistent with the codebase.

Reuse installed icon, table, chart, or UI libraries where appropriate. Do not install a new dependency unless it provides a clear benefit that cannot be achieved with the current stack.

---

## 10. Respect the Read-Only Data Boundary

For this task, the data flow must remain read-only.

Use the existing backend read endpoints to fetch data that already exists. Do not introduce write requests for new demo features.

Verify that newly added UI controls do not accidentally trigger mutations or invoke backend actions that were not part of the existing implementation.

For example:

* A demo chart filter may change local component state.
* A demo search field may filter the demo dataset locally.
* A demo-only dialog may open and close locally.
* A new Save or Create button must not claim that data was saved when no persistence exists.
* A new delete action must not delete an actual record.

If an existing workflow already includes backend-backed actions, do not redesign or modify the backend implementation as part of this task. Preserve existing functionality where necessary, and keep all **new** functionality non-persistent until separately approved.

Do not perform database writes, migrations, schema modifications, seeds, or data cleanup.

Do not add business rules to transform the demo into a partially working backend feature.

---

## 11. Improve Frontend Quality Without Expanding the Scope

While implementing the design, address frontend problems that directly prevent it from working properly, such as:

* broken layouts;
* duplicate component implementations;
* incorrect loading states;
* UI flicker;
* stale frontend state;
* unnecessary rerenders caused by the redesign;
* responsive overflow;
* broken navigation;
* missing empty states;
* inconsistent styling.

Keep these corrections focused on the frontend and the supplied design.

Do not use this redesign task to undertake a general performance refactor or resolve unrelated Map & Plotting, Rails, database, or business-logic issues.

If a pre-existing problem blocks implementation, document it separately rather than making an unrelated backend change.

---

## 12. Responsive Design and Accessibility

The new design must work at the screen sizes supported by the existing application.

Test desktop and narrower viewport layouts. Adapt the sidebar, tables, grids, dialogs, and toolbars appropriately to the available space.

Where the design specifies responsive behavior, follow it. Where behavior is not shown, follow the current product's established conventions.

Ensure:

* text remains readable;
* tables and cards do not break the viewport;
* navigation remains usable;
* dialogs fit within the screen;
* keyboard focus is visible;
* interactive elements have appropriate accessible labels;
* controls have clear hover, focus, disabled, and selected states;
* color contrast remains reasonable.

Do not use responsive CSS that unintentionally changes the intended desktop layout.

---

## 13. Testing and Visual Verification

After implementation, run the existing frontend checks and relevant tests.

### Functional verification

Verify that:

* existing pages render real data correctly;
* real API-backed information is not replaced by demo fixtures;
* all relevant navigation routes work;
* existing searches, filters, and tables remain functional;
* demo sections render their fixtures correctly;
* demo interactions do not persist changes;
* loading, empty, and error states render correctly;
* no new backend endpoints or mutation flows were introduced.

### Visual verification

Compare the implemented application with the supplied design.

Review every major screen and inspect:

* page structure;
* sidebar and header;
* spacing and typography;
* cards and tables;
* component proportions;
* visual hierarchy;
* colors, borders, shadows, and icons;
* responsive behavior.

If browser or screenshot testing is available, capture screenshots of the implemented screens and compare them against the reference design.

Do not claim pixel-perfect fidelity without having performed visual comparison.

### Regression verification

Test the existing pages affected by shared design-system changes, especially their data loading, routing, and interaction behavior.

Run the repository's available linting, TypeScript checks, and automated tests. Report any failures honestly.

---

## 14. Documentation Updates

Read the existing documentation conventions and update the relevant files after implementation.

Where appropriate, append dated entries to:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
```

Update other frontend documentation only if relevant.

Document:

* the design reference used;
* the screens implemented;
* shared components introduced or reused;
* existing real-data integrations preserved;
* new demo-only sections;
* which interactions are local-only and non-persistent;
* files changed;
* tests performed;
* remaining limitations and functionality deferred to a future phase.

Do not overwrite existing historical notes or create duplicate documentation unnecessarily.

---

## 15. Git and Change Management

Before making changes:

* inspect the active branch;
* inspect the working tree;
* preserve uncommitted user changes;
* identify the scope of the proposed frontend modifications.

Keep the implementation focused on the new design.

Do not reset, clean, discard, or overwrite unrelated changes.

Do not create a separate backend implementation or introduce database migrations.

At the end, review the final diff to ensure that no unintended Rails, API, or database changes have been introduced.

Do not commit or push unless the repository's established workflow or a separate instruction requires it.

---

## 16. Final Report

Provide a report with the following sections:

### Design Implementation

Summarize how the new design was implemented and which screens were changed.

### Real Data

Identify which screens continue reading actual data through existing backend APIs.

### Demo Data

List the new sections that use demo data and confirm that they are isolated and non-persistent.

### Backend and Database

Confirm that no backend code, API contracts, business logic, or database schema was changed. Report any unexpected scope issue explicitly.

### Testing

List the checks and tests that actually ran, including visual comparison where available.

### Files Changed

Summarize the key frontend components, styles, configuration, and documentation modified.

### Remaining Work

Identify data integrations and functionality intentionally deferred until the actual data sources and requirements are available.

---

# Final Acceptance Criteria

The task is complete when:

1. The supplied Claude Design reference has been inspected and understood.
2. The new design has been implemented in the existing Pynwheel Connect application.
3. The frontend matches the reference closely while preserving the current application architecture.
4. Existing data-backed features continue reading actual database data through their current read APIs.
5. New additions without data sources use clearly separated demo data.
6. Demo interactions remain local and do not falsely claim persistence.
7. Existing navigation and relevant functionality continue working.
8. No backend, API contract, business logic, or database schema changes have been made.
9. Relevant frontend tests and visual checks have been performed and reported accurately.
10. Project documentation has been updated with the actual implementation and remaining gaps.

# FINAL INSTRUCTION

First understand `overview.md`, `context.md`, the current progress documentation, and the supplied Claude Design reference.

Then inspect the existing Next.js application, map the design to current pages and components, and implement it with minimal disruption.

**Use the new design for the UI, existing backend read APIs for real data, and isolated demo data for genuinely new additions. Do not change the backend, add business logic, or modify the database.**

The objective is to deliver a polished, consistent Pynwheel Connect frontend now, while leaving future data integration and new business functionality clearly separated for a later phase.
