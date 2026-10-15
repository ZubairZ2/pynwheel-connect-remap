# IGLOO INTEGRATION — MIGRATE LEGACY BEHAVIOR TO THE CAPACITOR TOUR APP, TEST END-TO-END, AND DELIVER AN APK

## 1. Objective

I have tested the Igloo integration in the old legacy Pynwheel Tour application, `pyn-tour-old`. Now I want to bring the **same working Igloo integration into the new Capacitor Tour App**.

The legacy application is the reference for the existing Igloo integration's behavior, workflows, backend communication, and business rules. The new Capacitor app remains the target product and must retain its current design, navigation, visual theme, and user experience.

The goal is to reproduce the working integration in the Capacitor app, reuse the existing backend and supported API flows, close any integration gaps, validate the full user journey, and provide an installable Android APK for testing.

This is an implementation and delivery task, not just an analysis or code-review task.

### Core requirements

1. Understand how Igloo works in the legacy application before modifying the Capacitor app.
2. Reuse the existing backend, API contracts, business logic, and integration mechanisms wherever possible.
3. Adapt the implementation to the Capacitor app's existing architecture and UI.
4. Add only the missing flows that are genuinely required for the Igloo integration.
5. Test the integration end-to-end, including communication with the actual configured server.
6. Build and deliver an Android APK that can be installed and tested on an Android device.
7. Update all relevant project documentation with the actual implementation and test results.

**Do not build a second, independent Igloo integration with different business logic. Do not redesign the Capacitor app to resemble the legacy application.**

---

## 2. Understand Both Projects Before Coding

### Legacy reference application

The legacy React Native application is located at:

```text
/Users/zubairzulifqar/Downloads/pyn-tour-old/
```

Its integration context is documented in:

```text
/Users/zubairzulifqar/Downloads/pyn-tour-old/CONTEXT.md
```

Read `CONTEXT.md` completely and inspect the actual implementation files that it references.

Do not rely on the context document alone. Trace the real code paths to understand how the working integration operates.

### New Capacitor application

Locate the current Capacitor Tour App by reading the new project's documentation and inspecting the repository structure.

Before implementation, read the latest relevant versions of:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
tour-app-implementation.md
tour-app-backend-api.md
```

Locate the actual files if names or locations differ. Read the documentation that describes the current mobile architecture, backend setup, API configuration, Android build process, and previous testing.

Inspect the existing Capacitor app's:

* navigation and screen structure;
* authentication and session management;
* property selection;
* tour-building flow;
* stop selection;
* route generation and map rendering;
* API client and repositories;
* API types and response models;
* environment configuration;
* existing external integrations;
* loading and error states;
* Android and Capacitor configuration;
* available automated tests.

Understand the current implementation before changing it. Preserve unrelated uncommitted work and avoid overwriting existing user changes.

---

## 3. Perform a Legacy-to-Capacitor Integration Gap Analysis

Before implementation, identify precisely how the legacy Igloo integration works and which parts already exist in the Capacitor application.

Trace the complete working legacy flow, including the relevant screens, actions, API calls, backend responses, configuration, and error handling.

Inspect, where applicable:

* Igloo configuration and integration initialization;
* property or building eligibility;
* authentication and authorization requirements;
* available devices, connections, or integration resources;
* user selection and confirmation steps;
* pairing, linking, or connection workflows, if supported;
* required identifiers and relationships;
* backend requests and responses;
* status and connection-state handling;
* integration actions initiated by users;
* success, failure, timeout, and retry behavior;
* refresh, disconnect, and reconnect behavior, if supported;
* persistence and session behavior;
* any required platform permissions;
* navigation between the Igloo flow and the tour experience.

These are investigation points, not instructions to invent features. Implement only the workflows that are actually part of the existing Igloo integration or are necessary to support it correctly in the Capacitor app.

### Create a gap matrix

Document your findings in a table like this before implementing the changes:

| Integration capability       | Legacy behavior    | Already supported in Capacitor? | Required change    |
| ---------------------------- | ------------------ | ------------------------------- | ------------------ |
| Integration initialization   | Verified from code | Yes/No/Partial                  | Reuse or implement |
| Configuration                | Verified from code | Yes/No/Partial                  | Reuse or implement |
| Authentication/authorization | Verified from code | Yes/No/Partial                  | Reuse or implement |
| Main Igloo workflow          | Verified from code | Yes/No/Partial                  | Reuse or implement |
| Backend communication        | Verified from code | Yes/No/Partial                  | Reuse or implement |
| Status and error handling    | Verified from code | Yes/No/Partial                  | Reuse or implement |
| Navigation and completion    | Verified from code | Yes/No/Partial                  | Reuse or implement |

Use actual findings rather than assumptions. Add rows for any additional capabilities discovered in the legacy implementation.

This gap matrix should guide the work and help avoid duplicating functionality that already exists in the Capacitor app.

---

## 4. Reuse the Same Backend and Business Logic

The requirement is to reproduce the legacy Igloo integration using the **same existing backend integration and business rules**, adapted to the Capacitor app.

Trace the legacy implementation from the user action through to the actual backend request and response. Identify which parts are frontend-only and which rely on backend services.

### Required approach

* Reuse the existing Rails/backend endpoints and supported API contracts where applicable.
* Reuse existing service behavior, request formats, response semantics, identifiers, and domain rules.
* Use the Capacitor app's existing API client and repository architecture where appropriate.
* Do not create duplicate endpoints for functionality that already exists.
* Do not reproduce backend business logic independently in the mobile frontend.
* Do not change endpoint semantics merely to simplify the new UI.
* Do not hardcode integration responses or simulate successful backend operations.
* Do not introduce new database models, schema changes, or migrations unless a verified requirement cannot be satisfied by the existing architecture. Any such need must be clearly identified and justified before proceeding.

If the legacy integration uses a different API client or authentication mechanism, determine whether the current Capacitor architecture can use the existing backend interface safely.

Where an API contract is genuinely missing or incompatible, make the smallest necessary additive change and keep existing consumers backward compatible.

Document every required backend change and why it cannot be handled through the existing API contract.

**The aim is integration parity, not a backend rewrite.**

---

## 5. Adapt the Integration to the Capacitor App's Existing UI

The new Capacitor app must keep its current visual identity.

Preserve its:

* color palette and theme;
* typography;
* spacing and layout conventions;
* navigation patterns;
* button and form styles;
* modal and sheet presentation;
* loading indicators;
* error and success feedback;
* mobile interaction patterns;
* accessibility conventions.

Use the legacy application as a reference for behavior and integration logic, **not as a visual template**.

Do not copy the legacy React Native screens directly if doing so would conflict with the Capacitor app's existing design and component architecture.

Instead, map each required Igloo step into the most appropriate existing Capacitor screen or component.

Reuse existing components when possible. Add new reusable components only when needed by the integration.

Avoid:

* introducing a second design system;
* duplicating existing screens;
* adding unnecessary navigation steps;
* introducing new settings or configuration screens without a real requirement;
* displaying technical backend details to end users;
* changing unrelated Tour App screens.

The result should feel like a native part of the current Capacitor application rather than a separate legacy feature embedded inside it.

---

## 6. Add Only Mandatory Missing Flows

Some flows required by the legacy Igloo integration might not yet exist in the Capacitor app.

Compare the actual workflows and implement the missing steps only when they are necessary for the integration to function correctly.

For each missing flow:

1. Identify the corresponding legacy behavior.
2. Explain why the current Capacitor experience cannot complete the same operation.
3. Confirm whether the flow is mandatory or can be handled by an existing screen.
4. Integrate it into the current app's navigation and theme.
5. Reuse existing state, data, and backend services where possible.
6. Add appropriate loading, validation, success, and failure handling.
7. Test both the new flow and the surrounding user journey.

### Avoid unnecessary additions

Do not introduce a new flow merely because the legacy app had a separate screen for it.

If the Capacitor app already provides an equivalent capability, integrate Igloo into that capability instead of duplicating it.

For example, when an existing property-selection or settings flow can correctly provide the necessary context, prefer reusing it over introducing a separate selection screen.

The guiding rule is:

**Add the minimum functionality needed to achieve the same valid Igloo behavior in the new application.**

Do not omit a genuinely required step just to avoid changing the UI, but do not expand the feature beyond the established integration requirements.

---

## 7. Preserve Authentication, Configuration, and Security

Inspect the exact authentication and configuration behavior of both applications.

Verify that the Capacitor app correctly handles:

* backend authentication;
* token or session management;
* authorization for the selected property;
* required integration credentials or configuration;
* expired sessions;
* unauthorized responses;
* network failures;
* sensitive integration data.

Reuse the existing supported authentication and configuration mechanisms where appropriate.

Do not:

* embed secret credentials or private keys in the APK;
* hardcode production passwords or tokens;
* expose credentials in application logs;
* bypass authentication to make integration tests pass;
* grant users access to unauthorized properties;
* print secrets in the final report.

Distinguish between public client configuration and credentials that must remain on the backend.

If Igloo requires a server-side credential or privileged operation, it must remain protected through the existing backend mechanism rather than being transferred into the mobile bundle.

---

## 8. Implement Robust API and State Handling

The integration must remain reliable under normal mobile conditions.

Inspect how the legacy application handles failures and reproduce the appropriate behavior within the Capacitor app's architecture.

Verify that:

* loading states appear while required requests are in progress;
* successful operations produce clear feedback;
* failed requests display meaningful errors;
* users can retry recoverable failures;
* duplicate taps do not unintentionally start duplicate operations;
* cancelled or stale requests do not overwrite current state;
* returning to the screen restores or refreshes state appropriately;
* switching properties does not expose stale integration data;
* expired authentication is handled consistently;
* the integration does not leave the app permanently loading;
* navigation remains usable after failures.

Do not use fake success responses or suppress errors to make the integration appear to work.

Reuse existing shared error-handling and API utilities rather than introducing competing implementations.

---

## 9. Keep the Existing Tour App Functional

Igloo integration must not break the rest of the Capacitor Tour App.

Regression-test the existing core experience:

* login and logout;
* property selection;
* Build Your Tour;
* stop selection;
* map and SVG rendering;
* route generation;
* route instructions;
* Play Route;
* floor transitions;
* existing API and network error handling.

Integration state must not corrupt, overwrite, or unnecessarily reset existing tour state.

If Igloo requires access to a selected property or another tour resource, obtain it using the established data flow rather than introducing a competing source of truth.

Keep the changes focused on Igloo and any directly required shared integration points.

---

## 10. Testing Strategy — Follow the Legacy Behavior, Prove the Capacitor Implementation

Test the Capacitor implementation against the actual behavior established by the legacy code and the configured backend.

Do not consider a successful build or a successful API response sufficient evidence that the integration works.

### A. Legacy reference verification

Identify and record the relevant legacy test scenarios or manually verified flows.

Where the old app is runnable, reproduce the relevant behavior to establish a baseline.

Where it is not runnable, use its actual implementation, API contracts, and existing evidence to establish the expected behavior. Document anything that cannot be independently reproduced.

### B. Automated tests

Add or update tests for the integration logic, repositories, API interactions, state transitions, and UI flows as supported by the existing test infrastructure.

Cover:

* successful initialization;
* normal integration workflow;
* successful backend operations;
* invalid or missing input;
* unauthorized access;
* expired authentication;
* network failures;
* backend errors;
* timeout and retry handling;
* cancellation or repeated actions;
* state restoration;
* property changes;
* navigation away from and back to the integration.

Do not invent endpoint behavior or expected responses. Base assertions on the real backend contract and legacy implementation.

### C. End-to-end validation

Exercise the full integration flow:

```text
Launch Capacitor app
        ↓
Connect to the configured backend
        ↓
Authenticate using an authorized test account
        ↓
Select the relevant property/context
        ↓
Enter the Igloo workflow
        ↓
Complete each required integration step
        ↓
Verify real backend responses
        ↓
Verify the resulting state in the UI
        ↓
Navigate away and return
        ↓
Verify state and integration behavior
        ↓
Test error and recovery paths
```

Adapt the steps to the actual Igloo workflow discovered in the legacy application.

Record which flows were actually executed. If an external Igloo device, service, account, or environment is unavailable, report precisely what could not be tested instead of fabricating a successful result.

### D. Android-specific validation

Verify the integration inside the Capacitor Android WebView, not just in a desktop browser.

Pay attention to:

* API connectivity;
* HTTP/HTTPS and network-security requirements;
* Android permissions if genuinely required;
* redirects and authentication;
* external links or intents, where the integration uses them;
* state restoration;
* app foreground/background transitions;
* WebView-specific errors;
* Android back navigation;
* keyboard behavior and smaller-screen layouts.

Do not request additional Android permissions unless the existing integration actually requires them.

---

## 11. Configure the App to Reach the Correct Server

The APK must use the same intended backend/environment established by the current Capacitor project configuration and previous testing setup.

Before building:

1. Inspect the current environment variables and API base-URL configuration.
2. Read the project documentation and prior build instructions.
3. Identify which backend environment the test APK is supposed to use.
4. Verify that the configured server is reachable from the actual Android target.
5. Confirm that the app does not accidentally use a localhost URL that is unreachable from a physical device.
6. Ensure HTTPS, authentication, and Android network-security requirements are handled correctly.
7. Confirm that the integration requests reach the intended backend.

Do not guess the server URL or silently switch environments.

If the intended server configuration is ambiguous, determine the established configuration from the repository and existing setup instructions. If a necessary server value is unavailable, report that exact blocker instead of building an APK that appears functional but cannot connect.

Keep the server address configurable through the project's established environment configuration.

Do not embed credentials, private tokens, or other secrets in the APK.

**Do not change the shared production server configuration or modify production data to facilitate testing.**

If local services must be started for the test workflow, follow the existing project setup and use a server address reachable from the selected Android environment.

---

## 12. Build an Installable Android APK

After implementation and targeted tests, build an APK using the Capacitor project's existing Android build configuration.

First inspect the repository's build scripts and Android project structure. Follow the established process rather than introducing an unnecessary alternative build pipeline.

The APK must include the new Igloo integration and have the intended test-server configuration.

### Required build validation

* Build completes successfully.
* The Android package has the expected application identity.
* The intended API base URL is configured.
* The Capacitor web assets bundled into the APK are current.
* The build contains the implemented Igloo flow.
* No development-only mock implementation is used to fake integration success.
* The APK can be installed using the normal Android installation workflow.
* The app launches without a fatal startup error.
* The existing Tour App functionality remains available.
* The Igloo integration can reach the configured backend, where the required environment and credentials are available.

Prefer a **debug/test APK** unless the existing project configuration or testing workflow explicitly requires a different build type. Do not change signing or release settings unnecessarily.

If an Android device or emulator is available, install the APK and perform smoke tests. If not, build and verify the artifact as far as the available environment allows, and explicitly distinguish a successful build from a device-tested integration.

### Deliverable

Produce a clearly named APK, for example:

```text
artifacts/pynwheel-tour-igloo-test.apk
```

Use the repository's artifact conventions if it already has a preferred output location.

Ensure the file actually exists before reporting it as available. Provide the exact path and a direct download link in the final response when the environment supports artifact links.

Do not rename an unrelated or outdated APK and present it as the new build.

---

## 13. Update All Relevant Documentation

Update the current project's existing documentation without removing historical information.

At minimum, inspect and update the relevant files among:

```text
overview.md
context.md
progress.md / prgress.md
PYN_CONNECT_PROGRESS.md
tour-app-implementation.md
tour-app-backend-api.md
```

Also update any existing Igloo integration documentation or mobile build instructions.

Use dated, append-only updates where the project maintains a historical log.

Document:

* what the legacy Igloo integration actually does;
* which legacy workflows were reused;
* which Capacitor capabilities already existed;
* which missing flows were added and why;
* the implementation architecture;
* backend endpoints and contracts reused;
* any necessary API changes;
* authentication and configuration requirements;
* files changed;
* automated and manual tests performed;
* Android build configuration;
* intended backend environment;
* exact APK location;
* device/emulator verification status;
* known limitations and remaining work.

Never write that a test passed if it was not executed successfully.

Avoid duplicating entire documents or overwriting prior project context. Update the existing documentation according to its current structure and conventions.

---

## 14. Git and Change Management

Keep the work isolated and easy to review.

Before completing:

* review all changed files;
* ensure unrelated changes are not included;
* remove temporary debug logs and test-only workarounds;
* verify no credentials or sensitive data have been added;
* run the relevant formatting, lint, type-checking, and test commands;
* review the final diff for unintended behavior changes.

Do not reset unrelated changes.

Do not alter the legacy application's behavior as part of this task unless a clearly necessary and separately justified correction is identified. The old application serves primarily as the working integration reference.

Do not automatically push changes or create commits unless required by the repository's established workflow or an explicit instruction.

---

## 15. Final Implementation Report

At the end, provide a concise but evidence-based report with the following sections.

### A. Legacy Integration Findings

Summarize the verified Igloo architecture, workflows, backend calls, and business rules from `pyn-tour-old`.

### B. Capacitor Gap Analysis

List the existing capabilities reused and the genuinely missing flows that were implemented.

### C. Implementation

Describe the frontend, API, backend, configuration, and Android changes, including the relevant files.

### D. Testing

Report:

* automated tests run;
* integration tests run;
* successful end-to-end flows;
* failure and recovery tests;
* regressions checked;
* Android device/emulator tests;
* anything blocked by unavailable external dependencies.

### E. Backend and Configuration

State which existing backend/API flows were reused and whether any backend modifications were necessary.

Never include actual secrets, tokens, passwords, signed credential-bearing URLs, or database connection strings.

### F. APK Delivery

Include:

```text
APK path:
Build type:
Application/package ID:
Configured server environment:
Build status:
Installation status:
Device/emulator test status:
```

Use verified values.

### G. Documentation

List the documents updated and the changes recorded.

### H. Remaining Issues

List only genuine unresolved issues, along with their impact and what is required to validate or fix them.

---

# 16. Final Acceptance Criteria

The task is complete when all achievable criteria below have been verified:

1. The legacy Igloo implementation has been inspected and its relevant behavior documented.
2. The Capacitor integration reuses the same established backend and business rules where applicable.
3. The Capacitor app retains its existing theme, navigation, and visual conventions.
4. Only genuinely missing, necessary integration flows have been added.
5. The integration uses the real configured backend rather than fake responses.
6. Authentication, authorization, error handling, and sensitive configuration remain secure.
7. Relevant automated tests pass, or failures are clearly documented.
8. The full integration workflow has been tested to the extent supported by the available environment.
9. Existing Tour App functionality continues to work.
10. An APK has been successfully built with the intended server configuration.
11. The APK's actual installation and end-to-end test status are reported honestly.
12. Relevant project documentation has been updated.
13. Unrelated user work and existing legacy behavior have been preserved.

---

# FINAL INSTRUCTION

Start by understanding the current project documentation and the complete Igloo implementation in:

```text
/Users/zubairzulifqar/Downloads/pyn-tour-old/
```

Then inspect the existing Capacitor app, map the implementation gaps, and integrate Igloo by reusing the established backend and business logic.

**The legacy application defines the integration behavior; the Capacitor application defines the new user experience.**

Add missing flows only where they are necessary, preserve the current Capacitor design, test the real integration instead of simulating it, configure the Android app to reach the intended server, and deliver an installable APK.

Do not declare the task complete merely because the code compiles. Completion requires evidence of functional integration, regression testing, a built APK, updated documentation, and a clear account of anything that could not be tested.
