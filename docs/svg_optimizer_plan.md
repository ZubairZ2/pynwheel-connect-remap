# SVG Background Optimizer — Work Plan

Internal staff tool for fixing slow map load times caused by oversized SVG
files. This document covers what's already built and verified (Phase 1),
what's being built now (Phase 2), the property-level eligibility rules, and
every safety mechanism protecting production data.

## 1. Problem & root cause

`pyn-map-sdk.js` map loads were slow on cold paths (first visit, hard
refresh, new browser, expired session). Measuring a real production
floorplate SVG confirmed the cause: **74% of a 2.7MB file was a single
embedded JPEG background image at 2824×1824px**, base64-encoded inline
inside an `<image>` tag — far higher resolution than ever displayed, and
inflated ~33% by base64 encoding on top of that. This pattern was confirmed
across multiple real production files (S3), not just one sample, with
reductions of 0% (already-lean files) up to 66.6% depending on how bloated
the original export was.

The fix: extract the embedded raster, re-encode it more efficiently, and
put it back — without touching anything else in the file.

## 2. Phase 1 — diagnostic tool (built, tested, live)

**Not connected to production data.** Runs entirely in memory per request;
nothing is written to S3, the database, or any model.

- **`SvgBackgroundOptimizerService`** (`app/services/`) — the core engine.
  Detects every `<image>` element anywhere in an SVG document (direct
  child, or indirectly via `<pattern><use>`, `<mask>`, `<clipPath>` — any
  wrapper) whose `href` is a `data:image/...;base64,...` URI, regardless of
  which design tool produced the file. Re-encodes each one to WebP **at its
  original pixel dimensions** (no resizing in this version) if it's above a
  size threshold (default 40KB decoded — skips tiny icons/textures where
  there's nothing meaningful to save). Mutates **only** that `href`
  attribute value, via an exact substring replacement on the raw file text
  — never a DOM re-serialization — so every other byte (patterns, filters,
  masks, unit polygons, `pointerData`) is provably untouched.
- **`script/svg_background_optimizer.rb`** — CLI wrapper around the same
  service, for batch-testing files from the command line.
- **`/tools/svg_optimizer`** (super-admin only) — upload a file or paste a
  URL, see before/after size, an estimated download-time improvement at a
  few connection speeds, a per-image breakdown, a side-by-side visual
  preview (original vs. optimized, both loaded via `<img>` — not
  `innerHTML` — so untrusted SVG content can't execute embedded
  scripting), and a download button. URL fetches are SSRF-hardened
  (http/https only, private/loopback/link-local IPs rejected, bounded
  redirects, size-capped streaming read).

**Validation performed:** ran against 11 genuinely different real files (4
production S3 URLs + 7 deduplicated local samples) — zero crashes, and a
byte-level diff proving every file's content *outside* the image `href`
values is 100% identical before/after, on every file. This is the
guarantee the whole rest of the plan builds on.

## 3. Phase 2 — production bulk optimize + revert (in progress)

This phase actually rewrites the live S3 files real renters' maps load, so
the design is built around one rule: **nothing is ever overwritten without
a verified backup existing first.**

### 3.1 Data model — `SvgOptimizationRun` (migrated)

One row per write this tool ever makes to a Floorplate's or Sitemap's
`svg_image`. Key fields:

| Field | Meaning |
|---|---|
| `community_id` | which property |
| `target_type` / `target_id` | polymorphic — the `Floorplate` or `Sitemap` written to |
| `action` | `"optimize"` or `"revert"` |
| `reverts_run_id` | set when `action == "revert"`; points at the run being undone |
| `status` | `queued → running → verified → uploaded`, or `failed` / `skipped` |
| `backup_url` | where **what was live immediately before this run's write** was copied, before the write happened |
| `resulting_url` | what's live after this run's write completed |
| `original_bytes` / `optimized_bytes` / `reduction_pct` | stats for display |
| `error_message` | set on failure, shown in the UI |

**State-based, backups hold only the TRUE ORIGINAL** (revised model —
supersedes both the version-chain and the earlier "once ever" designs):

- A map's actionable state is derived from `optimized_now?(run, target)` =
  *latest run is an uploaded optimize AND the live `svg_image.url` still equals
  that run's `resulting_url`*.
  - **Optimizable** when NOT `optimized_now?` — i.e. the live file is the
    original/fresh file: never optimized, reverted back, or freshly re-uploaded
    in the CMS. So optimize → revert → **re-optimize** is allowed.
  - **Revertable** only when `optimized_now?` — the live file is still our
    WebP output.
- **CMS re-upload safety:** if someone uploads a new SVG on the floorplate/
  sitemap CMS page, the live URL no longer matches the old run's
  `resulting_url`, so `optimized_now?` is false — the map is treated as a fresh
  original (optimizable), and revert is refused (never restores a stale backup
  over the new file).
- **Optimize** backs up the current live file (the original), recording
  `original_bytes`/`optimized_bytes`/`reduction_pct`. On re-optimize it
  **reuses an existing byte-matching original backup** instead of duplicating.
- **Revert** restores the original from the optimize run's `backup_url` and
  creates **no backup of its own** — backups only ever contain originals.

### 3.2 S3 backup layout — `SvgBackupUploader` (built)

Property-id-first, so a property's entire backup history can be purged
later with a single prefix delete once its optimization is confirmed
stable:

```
uploads/svg_optimizer_backups/<community_id>/<target_type>/<target_id>/<run_id>-<timestamp>-original.svg
```

Only the (single) optimize run per map writes a backup, and it always
contains the **true, full-size original**. Revert writes no backup. So a
map's backup prefix holds exactly one file: its original.

### 3.3 Worker pipeline (`SvgOptimizationWorker`, built)

Everything below runs in Sidekiq — **the web thread never touches S3,
image processing, or HTTP fetches.** The controller only ever creates a
`queued` row and enqueues a job.

Ordering is the safety mechanism — each step is a hard gate the next step
depends on:

1. **Fetch** the target's currently-live SVG bytes.
2. **Optimistic concurrency check**: capture `target.updated_at` now. If it
   later doesn't match right before the write, abort — something else
   (e.g. a manual re-upload through the normal CMS form) touched this file
   mid-flight, so we back off rather than clobber it.
3. **Compute the new content:**
   - `optimize` → run `SvgBackgroundOptimizerService`. If it found nothing
     worth changing (no embedded images, or everything below threshold —
     this is the expected outcome for `is_beans_svg?` properties), mark
     `status: "skipped"` and **stop — no write, nothing to back up.**
   - `revert` → fetch the bytes from `reverts_run.backup_url`. If that
     backup is unreachable (deleted, S3 error), fail here — live file
     untouched.
4. **Structural verification** (only for `optimize`): strip all
   `data:image/...;base64,...` href values from both the original and the
   candidate output and byte-compare what's left. Any difference outside
   the image data aborts the run — the live file is never touched.
5. **Backup** the bytes fetched in step 1 to the property's S3 backup repo,
   then **re-fetch and confirm the backup actually landed**. If the backup
   write or its confirmation fails, stop — we do not proceed to overwrite
   anything we haven't verifiably already saved a copy of.
6. **Re-check** the concurrency guard from step 2 one last time.
7. **Write**: reassign `target.svg_image` to the new bytes through the
   model's normal CarrierWave path (the same mechanism a manual CMS
   re-upload already uses — no new upload code path invented) and save.
   CarrierWave's default behavior deletes the previous live file once the
   new one is stored — which is exactly why step 5 must succeed first.
8. Mark `status: "uploaded"`, record `resulting_url`, `finished_at`.

Any exception at any step marks that run `"failed"` with the message and
stops — it never partially applies a write. `sidekiq_options retry: 0`:
failures don't silently auto-retry against a job that may have
partially mutated state; a human decides whether to re-trigger, which
creates a clean new row rather than mutating the failed one.

### 3.4 Property-level checks (controller, built)

**Eligibility to appear in the properties list at all:**
`enable_svg_mode: true` **and** at least one Floorplate/Sitemap with a
non-blank `svg_image`. Communities without real SVG maps (the vast
majority) are excluded — listing thousands of irrelevant properties would
make the list useless.

**Per-property target resolution:**
- `is_sitemap?` → target = `community.sitemap`, only if present.
- otherwise → targets = `community.floorplates.where.not(svg_image: nil)`.
- Floorplates with only a legacy raster `image` and no `svg_image` are
  excluded from the target list, not treated as errors.

**`is_beans_svg?` properties**: still listed (not hidden — hiding them
would be confusing), but always resolve to "skipped — nothing to
optimize," since their floorplate/sitemap SVGs are transparent unit-only
overlays with no embedded background to begin with. No special-case code
branches on this flag anywhere; it falls out naturally from the
content-based detection. (Their separate `background_svg_image` field is a
different column entirely and is **out of scope** for this phase.)

**Duplicate-trigger guard**: before enqueueing, check whether any of a
property's targets already have a `queued`/`running`/`verified` run. If
so, the Optimize action is blocked for that property until they finish —
prevents two workers racing on the same file.

**Aggregate status rollup** (`property_rollup`, drives the list + polling):
rolls up by each map's CURRENT state (via `optimized_now?`), not just "did the
last run succeed" — so a property optimized then reverted reads **Not
optimized**, staying in sync with the review screen. States:
`not_started` (none currently optimized — fresh or all reverted) /
`partial` (some optimized) / `done` (all optimized) / `in_progress` /
`done_with_errors`, with a count (e.g. "2/3 optimized").

### 3.5b Review-first flow (built — supersedes the old confirm modal)

Clicking a property no longer pops a bare confirm modal. It opens a dedicated
**review page** (`svg_optimizer#review`, `properties/:community_id/review`) that,
for every target, calls `svg_optimizer#analyze` (`…/analyze?target_type=&target_id=`)
— the same in-memory engine as the standalone diagnostic tool, reading the live
file storage-agnostically via `SvgStorageReader`, writing nothing. Each target card
shows before/after sizes, download-time savings, the embedded-image breakdown, notes,
and a visual original-vs-optimized `<img>` preview (non-scripting context). A combined
summary rolls the whole property up. Only after the admin reviews everything and ticks
the acknowledgement does the sticky action bar enable the write, which then POSTs
`run_optimize` and switches to live status polling (capped at 10 min so a stuck
`running` row can't poll forever). Per-map Revert appears once a map is optimized.

`SvgStorageReader` (`app/services/`) is shared by the worker and the analyze endpoint,
so live-file reads behave identically in prod (fog/S3) and dev (`:file`).

### 3.5 Confirmation flow (view, built)

Clicking Optimize on a property does **not** immediately enqueue anything.
It opens a modal that:
- States plainly that this replaces the live SVG files real renters' maps
  load, and that CarrierWave deletes the previous file the moment the new
  one saves.
- Lists the exact targets about to be touched, with direct download links
  to their current live URLs (the S3 bucket is public, so this needs no
  proxy/zip — just links) so the admin can grab manual copies too, on top
  of the automatic backup.
- Requires explicit confirmation (typed confirmation or an "I understand"
  checkbox) before Optimize unlocks — deliberate friction for something
  this consequential.

Revert has its own, lighter confirmation per row, since it's restoring a
known-good previous state rather than mutating toward something new.

## 4. Safety precautions — summary

| Risk | Mitigation |
|---|---|
| Optimizer corrupts SVG structure | Only ever mutates a matched `<image>` href, via exact substring replacement — proven byte-identical elsewhere across 11 real files |
| Bad optimize result gets uploaded | Structural verification gate must pass before any write; MiniMagick re-encode asserts unchanged pixel dimensions |
| CarrierWave silently deletes the only copy | Every write is preceded by a backup that's fetched-back and confirmed *before* the write happens; write is skipped entirely if backup fails |
| Two workers race on the same file | Duplicate-trigger guard at the controller; optimistic concurrency re-check inside the worker |
| Admin re-uploads a file while we're mid-optimize | Concurrency check aborts the run rather than overwriting their fresh upload |
| Arbitrary URL fetch (SSRF) | Scheme restricted to http/https, private/loopback/link-local IPs blocked, bounded redirects, size-capped |
| Untrusted SVG content executes script in the browser | Previews render via `<img>` (non-scripting context), never `innerHTML` |
| Silent partial failure | `retry: 0`, every step updates row status immediately, errors surfaced per-row in the UI, no auto-retry masking a real problem |
| Accidental mass-trigger | Confirmation modal with explicit friction + direct download links before any property-level run starts |
| Unauthorized access | Every route gated by `is_super_admin?`, matching existing internal-tool patterns in this app |

## 5. Known limitations (accepted, not built around)

- If a Sidekiq worker process dies mid-job (deploy, crash), its row can
  stay stuck at `"running"` with no further updates. No automatic
  reconciliation is built for this — the UI will show a staleness warning
  (running too long) as a display-layer signal, not an auto-fix.
- `background_svg_image` (the separate shared-background asset used by
  Beans properties) is not covered by this phase.

## 6. Built state (all verified)

Phase 2 is complete. Final shape:

- **`SvgOptimizationWorker`** — the §3.3 pipeline, `retry: 0`, lowest-priority
  `general` queue (yields to all other jobs), storage-agnostic reads via
  `SvgStorageReader` (fog + dev `:file`). Optimize backs up the original
  (reusing a byte-matching existing backup); revert writes no backup.
- **`SvgOptimizerController`** (super-admin gated) —
  - `properties`: filterable table (name / company / type / status).
  - `review` + `analyze`: per-property review page; `analyze` reads the true
    original (from backup when the map is already optimized) so preview/download
    sizes are always correct.
  - `run_optimize` (all maps, or one via `target_type`/`target_id`), `run_revert_all`,
    `revert`, `requeue` (stuck-run recovery), `status` (poll).
  - Current-state helpers: `optimized_now?` (revertable / optimizable), and
    `property_rollup` (state-based list rollup: not_started / partial / done /
    in_progress / done_with_errors — in sync with the review screen).
- **Views** — `properties.html.haml` (table + polling) and `review.html.haml`
  (collapsible per-map cards, single + all-level Optimize/Revert, per-map
  Original/Optimized downloads, reusable confirm/alert popup, final optimize
  confirmation modal, Re-run, re-analyze-on-completion). Nav links in both side
  menus. `SvgOptimizerHelper#render_target_badge` for initial server render.
- **`SvgOptimizationRun`** is a thin record (runs only); statuses
  `queued→running→verified→uploaded`, plus `skipped` / `failed`. All
  current-state logic is in the controller, not the model.

Verified end-to-end on real dev data: optimize (−~25–50%, backup = true
original) → revert (no backup, exact original restored) → re-optimize (backup
reused) → CMS-reupload detection (revert refused, treated as fresh).
