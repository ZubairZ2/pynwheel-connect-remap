# Production DB / Legacy Compatibility Report — Map & Plotting / Wayfinding backend (PR #19)

**Date:** October 7, 2026
**Scope:** every DB and backend change merged by `65504c205` (PR #19, `feature/map_plotting_backend`, base `ab4ca7710`), audited against the legacy HTML/ERB application that keeps running on Server A.
**Method:** code inspection of the full merged diff; migration review; an exact clone of the local production dump (`createdb -T pynwheel_prod pynwheel_audit_clone`, 6.3 GB, 4,832 communities, 558,566 units, 4,343 hallways); roll back → baseline → migrate → compare; the **pre-merge legacy code** (git worktree at `ab4ca7710`) driven in-process against the clone before and after migration; the new code driven against the same clone; cross-version write/read tests through the real services; a long-lived legacy process tested across the migration.
**Everything below was measured, not assumed.** Scripts and raw evidence: `db_compat_audit/scripts/` and `db_compat_audit/evidence/` (untracked). Nothing was run against the live production database or Heroku.

---

## 0. Executive summary

| Area | Verdict |
|---|---|
| Schema change (11 migrations) | **SAFE.** Purely additive, every new column nullable or defaulted, no triggers/functions/views, no FK into legacy tables, reversible. Rollback and re-migration are exact round trips on production-shaped data. |
| Legacy Server A on the new schema | **PASS.** 335 page/JSON fingerprints identical before vs after migration; all legacy write paths (hallway add/move/connect/select/delete, elevator add/move/delete, stop toggle, unit edit) succeed and leave the same rows. |
| New Server B2 on the same DB | **PASS.** 103 Minitest runs green; 356 legacy page/JSON fingerprints identical to the legacy code on the same data; `ShortestPath` output byte-identical on 11 real properties; Tour App API answers. |
| Coexistence with Connect writes **OFF** (the default) | **PASS.** Both versions read and write the shared tables without conflict. |
| Coexistence with Connect writes **ON** while Server A runs the old code | **FAIL — 3 blockers** (§13). A Connect-created elevator breaks the legacy Elevators page; Connect's pending/SVG hallway rows change legacy routing; legacy-created hallway points are invisible to the new Tour App graph. |
| Rolling deployment | **One caveat.** A legacy process that outlives the migration can answer one 500 per connection on the first `destroy` touching a widened table (stale prepared plan). Restart Server A after `db:migrate`. |

**Decision: GO for the migration and the B2 code deploy with `PYN_CONNECT_WRITES=off`. DO NOT turn Connect writes on for any property while Server A still serves it, until the three fixes in §13 land.**

---

## 1. Change inventory (every DB and backend change in the merged diff)

Source: `git diff ab4ca7710 65504c205`, 132 files. Views, assets and JavaScript: **unchanged**. `Gemfile.lock`: unchanged. `Procfile`: unchanged (no `release:` phase; migrations run by hand).

### 1.1 Database

| Change | Type | New/Modified | Existing data affected | Legacy risk |
|---|---|---|---|---|
| `hallways.source` string NOT NULL default `'manual'` | ADD COLUMN | new | 4,343 rows take default | none |
| `hallways.review_status` string NOT NULL default `'confirmed'` | ADD COLUMN | new | default | none (legacy writes get default) |
| `hallways.confidence` float NULL | ADD COLUMN | new | NULL | none |
| `hallways.space` string NOT NULL default `'raster'` | ADD COLUMN | new | default | none |
| `hallways.community_id` integer NULL | ADD COLUMN + DATA MIGRATION | new | **backfilled** from parent (3,601 filled, 742 orphans stay NULL) | none for legacy; see §13 F3 for B2 |
| `hallways.detection_run_id` bigint NULL | ADD COLUMN | new | NULL | none |
| `hallways.confirmed_at` datetime NULL | ADD COLUMN | new | NULL | none |
| `hallways.created_by_user_id` integer NULL | ADD COLUMN | new | NULL | none |
| `index_hallways_on_community_id` | ADD INDEX | new | — | none |
| `index_hallways_routable_lookup (parent_type, parent_id, review_status, space)` | ADD INDEX | new | — | none |
| `index_hallways_natural_key (parent_type, parent_id, space, round(x_plot)::int, round(y_plot)::int)` | ADD INDEX (expression) | new | — | **new implicit constraint**: a NaN/±Infinity or \|coord\| > 2^31−1 would fail INSERT/UPDATE. Checked: 0 such rows in production data; the legacy editor sends pixel integers. LOW |
| `hallway_edges` | ADD TABLE (+4 indexes, 1 unique, 2 FK → hallways ON DELETE CASCADE, CHECK `from < to`) | new | 0 rows | none |
| `hallway_suppressions` | ADD TABLE (+1 index, no FK) | new | 0 rows | none |
| `hallway_attachments` | ADD TABLE (+3 indexes, 1 unique, FK → hallways ON DELETE CASCADE, CHECK mode consistency) | new | 0 rows | none |
| `hallway_detection_runs` | ADD TABLE (+2 indexes, 1 unique) | new | 0 rows | none |
| `wayfinding_stops` | ADD TABLE (+3 indexes, FK → hallways ON DELETE SET NULL) | new | 0 rows | none |
| `elevators.kind` string NOT NULL default `'elevator'` | ADD COLUMN | new | 192 rows default | none for schema; see F1/F4 for Connect-made rows |
| `elevators.accessible` boolean NOT NULL default true | ADD COLUMN | new | default | none |
| `elevators.floor_positions` jsonb NOT NULL default `{}` | ADD COLUMN | new | default | none |
| `index_elevators_on_community_id_and_kind` | ADD INDEX | new | — | none |
| `doors.note` text NULL | ADD COLUMN | new | NULL | none |
| `floorplates.wayfinding_version` int NOT NULL default 0; `svg_to_image_transform` jsonb; `scale_ft_per_px` decimal(10,6) | ADD COLUMN ×3 | new | 2,727 rows | none |
| `sitemaps` same three columns | ADD COLUMN ×3 | new | 840 rows | none |
| `tours.tour_setup_version` int NOT NULL default 0 | ADD COLUMN | new | 1,883 rows | none |
| `tour_stops.duration_minutes` int NULL | ADD COLUMN | new | 6,854 rows | none |
| `index_tour_stops_on_stop_type_and_stop_id` | ADD INDEX (CONCURRENTLY) | new | — | none |
| `index_units_on_floorplate_id` | ADD INDEX (CONCURRENTLY, 558k rows) | new | — | none |

Not present in the merge (docs mention them as planned): CHECK constraints on hallway coordinates/self-loops, `communities.wayfinding_v2_enabled`, the data-repair run. **No** ALTER COLUMN, RENAME, DROP, CHANGE TYPE/NULLABILITY/DEFAULT, ENUM, FUNCTION, TRIGGER or DELETE of existing data anywhere.

### 1.2 Backend code touching shared (legacy) paths

| File | Change | Legacy impact on Server A (old code) | Impact on B2's own legacy HTML |
|---|---|---|---|
| `app/helpers/shortest_path.rb` | 6 load sites read `.hallways.routable`; `fetch_hallways_coordinates_with_distance` uses `index_by` instead of a query per edge | none (Server A keeps old file) | output byte-identical (11 properties), 203 → 62 queries, 2.7× faster |
| `app/controllers/application_controller.rb` | `check_community` delegates to `User#can_access_community?`; `make_sure_one_selected_hallway` reads `.routable` | none | same outcomes (6 model tests + 356 identical page results) |
| `app/controllers/hallways_controller.rb` | new `save_graph` (JSON PUT, `Connect::WritesJson`); the 5 legacy actions render `.routable` rows | none | legacy JSON gains new keys (ignored by `maps.js`) and hides pending/svg rows |
| `app/controllers/tours_controller.rb` | new `save_setup`, `stop_list` | none | none |
| `app/controllers/automate_plotting_controller.rb#shortest_path` | JSON branch only when `format.json && params[:from]` | none | legacy call (`GET`, no format, no `from`) unchanged — verified identical |
| `app/models/hallway.rb` | validations, `inherit_community_id`, edge prune, version bump, `has_paper_trail`, scopes | none | legacy saves on B2 do one extra UPDATE (version) + one `versions` row |
| `app/models/{unit,amenity,door,elevator,building_starting_point,tour_stop}.rb` | `after_commit` version bumps; Elevator/BSP `before_destroy :destroy_legacy_tour_stops`; Elevator `kind` validation; TourStop `has_paper_trail` | none | **behaviour change on B2:** deleting an elevator/BSP now removes its stops in *every* tour (per-visitor copies too) — intended per docs |
| `app/models/{floorplate,sitemap}.rb` | `has_many :hallways, dependent: :destroy` (was none) + new has_manys | none | floorplate/sitemap delete on B2 now deletes its hallway rows (legacy orphaned them) |
| `app/models/community.rb` | has_many `wayfinding_stops`, `hallway_detection_runs` | none | none |
| `app/models/user.rb` | `can_access_community?`, `can_read_map?`, `can_edit_map?` | none | equivalent to old `check_community` branches |
| `app/serializers/connect/*` | new keys | none | Connect only |
| `config/routes.rb` | +3 PUT routes, +3 self-tour GET routes | none | additive |
| `app/controllers/api/self_tour/v1/wayfinding_controller.rb` + `token_authorization.rb` | new read-only Tour App API (same JWT / `API_ACCESS` rule as `start_tour`) | none | additive |
| `app/services/wayfinding/*`, `tour_setup/save.rb`, `tour_stops/{membership,remove}.rb`, `connect/{flags,writes_json}` | new | none | gated by `PYN_CONNECT_WRITES` |
| `lib/tasks/wayfinding_{snapshot,repair}.rake` | new, read-only / dry-run by default | none | none |
| `.gitignore` | `test/` rule removed | none | none |

---

## 2. Classification of every migration

| Migration | Classes | Reversible | Lock profile (PG 16) |
|---|---|---|---|
| 100001 AddWayfindingColumnsToHallways | ADD COLUMN ×8 (defaults = metadata-only), ADD INDEX ×3 (one expression), DATA MIGRATION (UPDATE hallways SET community_id, 2 statements) | yes (`down` removes all) | ACCESS EXCLUSIVE for ms on `hallways` (1.4 MB); UPDATE touches 3,601 rows; 0.15 s |
| 100002–100006 Create* | ADD TABLE, ADD INDEX, ADD FOREIGN KEY (to `hallways`), ADD CONSTRAINT (CHECK) | yes (drop table) | FK creation takes SHARE ROW EXCLUSIVE on `hallways` for ms |
| 100007 elevators | ADD COLUMN ×3 (defaults), ADD INDEX | yes | ms, 136 kB table |
| 100008 doors | ADD COLUMN | yes | ms |
| 100009 floorplates/sitemaps | ADD COLUMN ×6 (defaults) | yes | ms |
| 100010 tours/tour_stops | ADD COLUMN ×2 | yes | ms |
| 100011 AddPlottingIndexes | ADD INDEX ×2 **CONCURRENTLY**, `disable_ddl_transaction!`, `if_not_exists` | yes | no write lock on `units` (249 MB) / `tour_stops`; 0.32 s locally |

Measured on the clone: forward migration **0.5 s of DDL** (10.5 s including Rails boot); rollback of all 11 **12 s including boot**. Order is correct: each `Create*` FK refers only to `hallways`; nothing depends on a later migration. 100011 is non-transactional: an interrupted run leaves 1–10 applied and a possible INVALID index; the post-check `pg_index.indisvalid` query in `04_post_schema.sql` found none.

---

## 3. New-table compatibility audit (§6)

- **Legacy code references:** `git grep` of the pre-merge tree for `hallway_edges|hallway_suppressions|hallway_attachments|hallway_detection_runs|wayfinding_stops|HallwayEdge|WayfindingStop|…` → **0 hits** in `app/`, `lib/`, `config/`, `db/`. No name collides with a legacy model, table, association or route.
- **Foreign keys:** all four new FKs point *from* new tables *to* `hallways` (`ON DELETE CASCADE` ×3, `SET NULL` ×1). **No FK points at any legacy table** (`floorplates`, `sitemaps`, `communities`, `elevators`, `tours`…), so no legacy delete can be blocked. Verified: legacy `delete_hallways_point` on a Connect node with two `hallway_edges` rows → 200, both edge rows gone by cascade, no error (`chain` evidence, node 6076).
- **Triggers / functions / views:** none exist on any affected table before or after (`01_preflight.sql`, `04_post_schema.sql`).
- **Legacy deletes that orphan new rows:** a Server A floorplate/sitemap delete leaves `hallway_*` / `wayfinding_stops` rows pointing at the dead `parent_id` (exactly as it already orphans `hallways`: 742 such rows exist today). `Wayfinding::GraphBuilder` reads attachments only for records that still exist, so orphans are ignored, never fatal.

---

## 4. New-column compatibility audit (§7–§9, §29)

| Column | Nullable | Default | Legacy INSERT safe | Legacy UPDATE safe | Legacy SELECT safe | Evidence |
|---|---|---|---|---|---|---|
| hallways.source / review_status / space | NO | yes | ✅ row gets `manual/confirmed/raster` | ✅ | ✅ 17 keys in JSON, `maps.js` reads 5 | `legacy_A2_post.json` add_point row |
| hallways.community_id / confidence / detection_run_id / confirmed_at / created_by_user_id | YES | — | ✅ (NULL) | ✅ | ✅ | same |
| elevators.kind / accessible / floor_positions | NO | yes | ✅ `add_elevator` → `elevator/true/{}` | ✅ `update_elevator` | ✅ | `legacy_A2_post.json` add_elevator |
| doors.note | YES | — | ✅ | ✅ | ✅ | `05_legacy_write_sim.sql` |
| floorplates/sitemaps.wayfinding_version | NO | 0 | ✅ | ✅ | ✅ | plotexp/map pages identical |
| floorplates/sitemaps.svg_to_image_transform / scale_ft_per_px | YES | — | ✅ | ✅ | ✅ | |
| tours.tour_setup_version | NO | 0 | ✅ (legacy `create_tour` on first visit) | ✅ | ✅ | tour pages identical |
| tour_stops.duration_minutes | YES | — | ✅ `display_stop`, `add_elevator` stop, `find_or_create_by` | ✅ | ✅ | |

Legacy raw-SQL/bulk paths on the affected tables (`update_all` ×~40 on units/amenities/tour_stops/elevators/hallways, `delete_all` on tour_stops/units, `upsert_all` on unit_space_details, provider `upsert_unit` services) name explicit columns only and never the new ones: all remain valid. No legacy code does `INSERT … SELECT` or depends on a fixed column count/order; every `render json: hallways` is consumed by key name.

---

## 5. Actual schema verification (§13)

`pg_dump --schema-only` of the clone at three states: **B** (pre-migration), **A1** (the dump as received: already at `20261003100011`), **A2** (B re-migrated with the merged code). `A1` and `A2` are **identical** apart from the dump's random `\restrict` token. `B → A2` delta = exactly the 5 tables, 20 columns, 24 indexes (4 unique), 4 FKs and 2 CHECKs listed in §1.1, nothing else (`db_compat_audit/scripts/schema_*.sql`).

Post-migration object checks (`post_schema_A2.txt`): 20/20 columns with the stated nullability/defaults; 24/24 indexes; 0 invalid indexes; 4 FKs with the stated actions; 2 CHECKs; 0 triggers; backfill filled 3,601 rows with 0 mismatches against the parent; all 4,343 hallways routable under defaults; all 192 elevators defaulted; all version counters 0; all new tables empty.

---

## 6. Record counts and data integrity (§23, §32, §33)

| Table | B (pre) | A2 (post) |
|---|---|---|
| communities 4,832 · companies 224 · users 884 · floorplates 2,727 · sitemaps 840 · floorplans 70,134 · units 558,566 · amenities 56,194 · elevators 192 · doors 1,823 · building_starting_points 191 · tours 1,883 · tour_stops 6,854 · paths 2,991 · path_points 15,703 · hallways 4,343 (200 selected) · schedual_tours 6,682 · versions 53 | identical | identical |

`diff counts_B_pre.txt counts_A2_post.txt` → empty. `diff integrity_B_pre.txt integrity_A2_post.txt` → empty. The only data write of the migration is the `community_id` backfill (values derived, reversible, not read by legacy).

Pre-existing integrity findings (unchanged by the migration, documented for the data-repair ticket): 742 orphan hallways (519 Floorplate, 223 Sitemap parents missing); 5 hallways with dangling `next_points`; 50 self-loops; 8 levels with ≠1 selected node; 19 duplicate tour stops; 120 tour stops whose record is gone (61 BSP, 40 elevator, 19 unit); 2,160 units and 50,492 amenities whose community is gone; 94 units pointing at a missing floorplate; 22,279 plotted units with a floor outside their plate's range.

---

## 7. Migration safety report (§46)

**Migration:** 20261003100001–100011 (11 files) · **Purpose:** wayfinding persistence for Connect Map & Plotting / Tour Setup and the new Tour App API · **Tables affected:** hallways, elevators, doors, floorplates, sitemaps, tours, tour_stops (widened); hallway_edges, hallway_suppressions, hallway_attachments, hallway_detection_runs, wayfinding_stops (new) · **Columns affected:** 20 added, 0 changed · **Existing data affected:** `hallways.community_id` backfill only (3,601 rows) · **New records created:** none · **Constraints:** 2 CHECK on new tables; 4 unique indexes on new tables (empty, cannot conflict); 1 expression index on hallways (0 conflicting rows) · **Indexes:** 24 new · **Foreign keys:** 4, all new→hallways · **Triggers:** none · **Legacy impact:** none (§4, §8) · **B2 impact:** required by every new service · **Rollback:** `db:rollback STEP=11` tested — 12 s, exact schema round trip, **drops every row in the 5 new tables and the 20 columns** (so any Connect data written since the deploy is lost; counts/integrity of legacy tables unchanged) · **Test result:** PASS.

Pre-migration validation queries to run on production before `db:migrate` (`01_preflight.sql`): NaN/oversized hallway coordinates must be 0 (was 0); no name/column collisions (none); no triggers/views (none).

---

## 8. Legacy test report (§47)

**Environment:** macOS, PostgreSQL 16.15, Ruby 3.3.5, Rails 7.2.2 · **Database:** `pynwheel_audit_clone` (exact copy of the local `pynwheel_prod` dump) · **Legacy code version:** `ab4ca7710` (merge of PR #18, the last commit before PR #19) in a git worktree · **New backend version:** `65504c205` (main) · **Driver:** `db_compat_audit/scripts/harness.rb` — the real Rails app driven in-process (`ActionDispatch::Integration::Session`, Warden test login as `salahudin@pynwheel.com`, Super admin; no cookie materialised), recording status, exception, query count and content fingerprints (normalised hallway sets, `path_object` SHA, stop-row SHA, link counts) per request.

**Properties covered (discovered by query, not fixed ids):** 1411 John Demo (6 SVG plates, 146 hallways, 2 elevators), 1618 Hazel (31 plates, 228 hallways, 3 elevators), 1412 Jennifer Demo FP, 2934 Dummy-High-Rise (SVG), 1468 The Waymark, 557 The Ogden (tour **off**, 15 plates, 250 amenities), 2919 Sofia (407 hallways), 1105 Trestle (multi-building, 3 elevators), 1839 Kellie, 1234 Alderwood, 1786 Tour Demo (sitemap, 96 hallways), 2935 Dummy-Site-Map (sitemap, tour off), 1413 Jennifer's Pynwheel Demo (sitemap), 1935 Hazel Copy Test (274 hallways), 2000 Hazel Testing Community, plus discovered 4008, 1111, 2260, 1034. "Testing 123" does not exist in the dump.

| Flow | Legacy + old schema | Legacy + new schema | New code + new schema |
|---|---|---|---|
| Authentication / session (Warden login, `authenticate_user!`, `check_community`) | 200 on every protected page | identical | identical |
| Companies list, company edit, company's properties, search | 200 (links SHA equal) | identical | identical |
| Properties list / search / property edit (via company-scoped routes) | 200 | identical | identical |
| Units / Amenities / Elevators / Floorplans / Floorplates indexes (19 properties) | 200 | identical fingerprints | identical |
| Floorplate `plotexp` (3 plates per property) + `plot_amenities` | 200/302 | hallway sets identical | identical |
| Sitemap `plotexp` / `plot_amenities` (3 sitemap properties) | 200 | identical | identical |
| Map (`/automate_plotting`) hallway JSON, 19 properties | 200 | hallway sets identical (+8 extra keys) | identical |
| Run Algo `shortest_path` × 2 path types × 19 properties | 200 | `path_object` byte-identical | byte-identical; 3.3× fewer queries |
| Tour Setup, starting point, select stops, settings | 200 | identical | identical |
| Legacy write cycle: add / move / connect-leaf / select / delete hallway point (1411, 1618, 1786) | 200, graph restored | 200, same rewiring, new columns at defaults | n/a (legacy actions unchanged) |
| Legacy write cycle: `add_elevator` → `update_elevator` → delete stop (destroys elevator) | 200/200/302 | 200/200/302, `kind='elevator'`, `accessible=true` | — |
| `display_stop` toggle ×2, unit edit via form | 200/302 | identical | — |
| Legacy mobile `DELETE /api/self_tour/v1/…/start_tour.json` (1411, 1618, 2934) | — | 200 | 200 (unchanged jbuilder) |

**Totals:** 365 requests before, 386 after (company-scoped pages added between runs); 335 comparable fingerprints, **0 content differences, 0 status differences** between old and new schema; legacy vs new code on the same data: 356 comparable fingerprints, **0 differences**. Per-page query counts identical before/after (1 difference: `tours#index` created a missing `tour_setting` on first visit, a legacy write-on-GET).

**Console/server errors:** none attributable to the schema. The 500s recorded on bare `/communities` and `/communities/:id/edit` reproduce on the old schema and old code too (the view needs a company in the session; the company-scoped routes render 200). 404s: `sitemaps#index` has no route; two harness route guesses fixed between runs.
**Database errors:** none. **Unexpected behaviour:** none in reads. (Pre-existing legacy bug noted: `save_selected_point` leaves 0 selected nodes because `update_all` then `save` of an unchanged record is a no-op; identical before/after.)

**Engine harness:** `rake wayfinding:snapshot` run with the **legacy** code (pre-migration) and `rake wayfinding:compare` with the **new** code (post-migration) on 1411, 2934, 1468, 1839, 2919, 1105, 1234, 1786, 2935, 1618, 1412 → **all identical** (web `sorting` + `actual shortest`, mobile variant). (The rake task drops the first id when several are passed; 1411 was run separately.)

**Rails Minitest (new code):** 103 runs, 338 assertions, 0 failures, 0 errors, 7 skips.

---

## 9. Legacy app on the new schema — rolling deployment (§34, §35)

A **long-lived legacy process** was started on the old schema, served and wrote, then the migration was applied underneath it from the new code, then it served and wrote again without restart (`evidence/rolling.json`, `rolling2.json`):

- Map, Run Algo, Tour Setup, plotexp, hallway add/move/delete, `add_elevator`, `update_elevator`, `display_stop`, unit edit, `ElevatorsController#destroy`: **all succeed** with the stale column cache (new columns simply take defaults; `SELECT *` extra columns are tolerated).
- **One failure:** `TourStopsController#destroy` of an elevator stop → `ActiveRecord::PreparedStatementCacheExpired: cached plan must not change result type` → 500, once; the next identical request succeeds. Cause: PostgreSQL invalidates a connection's prepared `SELECT "elevators".*` plan when the table gains columns; Rails retries this transparently outside a transaction but not inside `destroy`'s transaction.

**Required deployment step:** restart Server A dynos right after `db:migrate` (or accept a handful of one-off 500s on the first destroy per connection on hallways/elevators/doors/floorplates/sitemaps/tours/tour_stops). No schema-cache dump exists (`db/schema_cache.yml` absent, `use_schema_cache_dump` unset), so a restart reloads columns from the DB.

**Safest order (from the actual changes):**
1. `heroku pg:backups:capture` (restore must finish before any `db:migrate`, PROG trap 16).
2. Run `01_preflight.sql` against production (NaN/oversized coordinates = 0, no collisions).
3. `heroku run rails db:migrate -a <B2 app>` **with the B2 code** (contains the migrations) while Server A keeps serving — 0.5 s of DDL, concurrent indexes on `units`.
4. `heroku restart` Server A (stale-plan caveat above).
5. Deploy B2 with `PYN_CONNECT_WRITES=off` (production default in `Connect::Flags`). Note: the default is **`on` in any non-production `RAILS_ENV`** — set the variable explicitly on every non-production dyno.
6. Deploy B1 (Next.js). Save buttons follow `meta.writes_enabled` / `can_edit_map` from the map read, so they stay disabled.
7. Run the legacy smoke list and `rake wayfinding:compare` on production (snapshot taken before step 3 with the old code is the honest baseline).
8. **Only after the fixes in §13:** `heroku config:set PYN_CONNECT_WRITES=on PYN_CONNECT_WRITES_COMMUNITY_IDS=<ids>` for properties, then repeat 7 for an allow-listed and a non-allow-listed property.

Rollback (verified mechanism): `PYN_CONNECT_WRITES=off` → the three write endpoints answer `404 {code:'disabled'}` immediately (checked per request in `Connect::WritesJson#load_connect_write_community`, no restart needed) → release rollback → `db:rollback STEP=11` only if the schema must go (drops Connect-written data; legacy tables untouched, proven on the clone).

---

## 10. Foreign-key / cascade audit (§10, §22)

| Parent | Child | ON DELETE | ON UPDATE | Rails `dependent` | Legacy impact |
|---|---|---|---|---|---|
| hallways | hallway_edges.from_hallway_id | CASCADE | no action | `Hallway has_many :edges_from, dependent: :delete_all` (new code) | A Server A node delete removes its edge rows — intended, tested |
| hallways | hallway_edges.to_hallway_id | CASCADE | no action | `edges_to, delete_all` | same |
| hallways | hallway_attachments.hallway_id | CASCADE | no action | `attachments, delete_all` | explicit stop link disappears → routing falls back to nearest point — intended |
| hallways | wayfinding_stops.hallway_id | SET NULL | no action | `belongs_to :hallway, optional` | stop survives unlinked — intended |

No cascade can delete a legacy record. No new FK references floorplates, sitemaps, communities, units, amenities, elevators, doors, tours or tour_stops, so no legacy delete is blocked. Server A deletes of units/amenities/elevators/doors/BSPs leave `hallway_attachments` rows behind (no FK by design); `GraphBuilder` ignores them.

---

## 11. Shared-DB contract (§43)

| Object | Owner | Rule |
|---|---|---|
| `hallways` legacy columns (`x_plot y_plot parent_* next_points selected`) | both | Adjacency lives in `next_points`; a confirmed Connect edge is mirrored there; both editors keep exactly one `selected` per level. |
| `hallways.source/review_status/space/confidence/detection_run_id/confirmed_at/created_by_user_id` | B2 | Legacy writes leave defaults. **Contract: while Server A runs the old code, only `review_status='confirmed'` + `space='raster'` rows may exist**, because Server A cannot filter them (§13 F2). |
| `hallways.community_id` | B2 (backfilled) | Legacy inserts leave it NULL. **Contract: B2 must not rely on it to find a level's nodes** (§13 F3) until Server A is retired, or a DB default/trigger fills it. |
| `elevators` | both | Legacy always stores an `image`; Connect rows must too (§13 F1). `kind != 'elevator'` rows are visible to legacy as elevators (§13 F4). |
| `tour_stops`, `tours.x_plot/y_plot`, `units/amenities` plotting columns, `doors`, `building_starting_points` | both | Connect writes reuse the legacy shapes (`PinWriter`, `StopWriter`, `Membership`, `TourSetup::Save`); legacy Tour Setup renders them — verified (stop counts rose by the Connect-created stops, pages 200). Connect `turn_on` also removes duplicate stops (19 exist today). |
| `hallway_edges / hallway_attachments / hallway_suppressions / hallway_detection_runs / wayfinding_stops` | B2 only | Invisible to legacy; cleaned by FK cascade on hallway delete; may be orphaned by legacy level deletes (harmless). |
| `*.wayfinding_version`, `tours.tour_setup_version` | B2 (CAS) | Legacy edits on **B2** bump them via callbacks; legacy edits on **Server A** do not. Connect may then overwrite a Server A change made after the Connect page loaded (no 409). Mitigated by `GraphVersion` using `max(updated_at)`/counts for rows with `community_id` set; not for new Server A rows (F3). |
| `versions` (PaperTrail) | both | Hallway/TourStop saves on B2 add rows (44 rows during this test cycle). |

---

## 12. Critical questions (§44)

- **Q1 Can old Server A run against the new migrated DB? YES.** 335 identical fingerprints before/after; 0 schema errors; long-lived process test (§9) with one restart caveat.
- **Q2 Can Server A keep writing to every table it writes today? YES.** All legacy write actions exercised (hallways ×5, elevators ×3, tour_stops ×3, tours, units) succeed; rows identical except the new columns at defaults. `update_all`/`delete_all`/`upsert` paths name explicit columns.
- **Q3 Can Server A keep reading every affected table? YES.** All indexes/pages identical; new columns are extra JSON keys the legacy JS ignores.
- **Q4 Can B2 run against the same DB? YES.** 103 tests green; 356 page fingerprints identical to legacy; ShortestPath identical; Tour App API 200 for tour-enabled properties, 422 `wayfinding_disabled` for 557 (tour off).
- **Q5 Can both operate simultaneously? YES with writes OFF; NO with Connect writes ON for a property Server A serves** (F1–F3).
- **Q6 Can a B2 graph/tour write be read safely by Server A? PARTIALLY.** Confirmed nodes/edges, tour stops, stop-list toggles, Tour Setup order/duration: **yes** (legacy pages 200, routes unchanged by the bridge edge alone). Pending/SVG nodes: **no** (legacy routing changed, SVG node drawn in SVG units on the image). Image-less elevators/stairs: **no** (legacy Elevators page 500).
- **Q7 Can a legacy Server A write be read correctly by B2? PARTIALLY.** Connect map/tour serializers: yes (new point 6083 present). `Wayfinding::GraphBuilder`/`GraphVersion`: **no** for new hallway points (`community_id` NULL → excluded; version unchanged → cached graph served).
- **Q8 Are any migration/schema changes destructive? NO.** Additive only; the only data write is a derived backfill. Rollback (`STEP=11`) is destructive to Connect-written data by nature — documented.

---

## 13. Findings and risk classification (§48)

| # | Finding | Evidence | Risk |
|---|---|---|---|
| **F1** | **Connect-created elevators/stairs have no `image`; the legacy Elevators page (`app/views/elevators/_index.html.erb:12`, `image_tag elevator.image.url`) raises "Nil location provided" → 500 on Server A *and* on B2's own HTML.** Legacy `add_elevator` always attaches `elev2.png`; `Wayfinding::StopWriter#create_vertical` does not. | `legacy_after_b2.json` + `new_after_legacy.json`: `/communities/1411/elevators` and `/1618/elevators` 500 after B2 writes; 200 before. | **BLOCKER** (when writes on) |
| **F2** | **Pending (`review_status='pending'`) and SVG-space (`space='svg'`) hallway rows written by Connect Detect / SVG flows are read by Server A's `ShortestPath` and map pages.** Isolation: with those rows hidden the legacy route equals the new code's (`c1c514e1…`, 14,154 chars); with them visible the legacy route loses legs (`e419669c…`, 9,108). Legacy map shows the SVG node at (1200.5, 900.25) image pixels. | `chain.log`, `legacy_shortest.rb` A/B/C runs; `legacy_after_b2.json` map counts 161→167 | **BLOCKER** (when writes on) |
| **F3** | **Server A `point_save` leaves `hallways.community_id` NULL; `GraphBuilder#load_rows` and `GraphVersion.for` select hallways by `community_id`.** A legacy-created node (6083) is absent from the Tour App graph while present in the Connect level serializer; the ETag/cache version does not move. | `new_graph_check.json`: `in_graph_builder_json:false, in_connect_level_serializer:true, null_cid_rows_on_level:1` | **HIGH** (coexistence) |
| F4 | Legacy mobile `start_tour` picks `first_floor_elev` from `@community.elevators` (all kinds); a Connect `stairs/ramp` row with matching building/floor can be chosen as the entry elevator; legacy CMS lists it as an elevator. Not triggered in this data (building NULL). | code `start_tour.json.jbuilder:125,144`; `legacy_after_b2.json` audit_mentions {} | MEDIUM (when writes on) |
| F5 | Rolling deploy: one `PreparedStatementCacheExpired` 500 per connection on the first `destroy` inside a transaction after the migration, until restart. | `rolling2.json` | MEDIUM → LOW with a Server A restart |
| F6 | B2-only behaviour changes for legacy flows: Elevator/BSP `before_destroy` removes stops in all tours; Floorplate/Sitemap destroy now destroys hallways; PaperTrail rows on Hallway/TourStop; one extra UPDATE per legacy save (version bump). All intended per docs; none affect Server A. | model diff; `versions` 53→97 during tests | LOW |
| F7 | `Connect::Flags.writes_mode` defaults to `on` when `Rails.env` is not production. | `app/services/connect/flags.rb` | LOW (set the var explicitly) |
| F8 | `TourStops::Membership.turn_on` deletes duplicate `tour_stops` and `Remove.call!` deletes the stop's legacy `paths`; 19 duplicate stops exist in production. | code; `03_integrity` | LOW (data-cleaning side effect) |
| F9 | `index_hallways_natural_key` turns NaN/±Inf/>2^31 coordinates into an INSERT error; 0 rows today, legacy JS sends ints. | `preflight_B_pre.txt` | LOW |
| F10 | `rake wayfinding:snapshot[a,b,…]` drops the first id. | `legacy_snapshot.log` | LOW (tooling) |
| F11 | New Tour App `tour_route` answers 422 `no_start` for 2934 while legacy `start_tour` answers 200 — a semantic gap of the new engine, new app only. | `new_A2_post.json` | INFO |
| F12 | The local `pynwheel_prod` dump is already migrated and contains Connect test writes (Hazel 1618 / plate 2241: 9 edges, 1 attachment, 2 wayfinding stops, Oct 5 by user 2399). Do not use it as a "pre-migration" reference or a restore source without knowing that. | `post_schema_A1_as_received.txt` | INFO |
| F13 | Pre-existing data debt (§6) unchanged by the migration; the repair rake exists but is unapplied. | `integrity_*.txt` | INFO |

### Required fixes before enabling Connect writes (all additive, new side only)

1. **F1:** `Wayfinding::StopWriter#create_vertical` must attach the default image the legacy action uses (`image: File.open(Rails.root.join('app/assets/images/elev2.png'))`) or the legacy partial must guard `elevator.image?` — the first keeps legacy untouched.
2. **F2:** while any property is served by old Server A code, Connect must not persist `review_status='pending'` or `space='svg'` rows into `hallways` (store proposals outside `hallways`, e.g. in the detection run's `result` / a staging table, or hard-disable Detect and SVG saves with the allow-list). Alternatively retire Server A's old code first.
3. **F3:** `Wayfinding::GraphBuilder#load_rows` and `GraphVersion.for` should scope hallways by the community's level ids (`parent_type/parent_id`, as `Connect::WayfindingSerializer#hallways` already does) instead of `community_id`; optionally a DB default via trigger or a scheduled `rake wayfinding:repair:community_ids`.
4. **F4:** exclude `kind != 'elevator'` from `@all_elevators` in the Tour App-era `start_tour` (B2) and document that Server A will list them until upgraded.
5. **F5:** add "restart Server A" to the runbook after `db:migrate`.

---

## 14. Evidence / tests performed (§49)

- Change inventory from the full merged diff; migration classification; model/controller/serializer/route review; legacy raw-SQL path grep (67 hits reviewed).
- Clone of the production dump; `db:rollback STEP=11` (12 s) → baseline B; `01_preflight.sql`; `02_counts.sql`/`03_integrity.sql`/`pg_dump --schema-only` at B, A1, A2, A3; `db:migrate` (10.5 s, 0.5 s DDL); `04_post_schema.sql`; `05_legacy_write_sim.sql` (legacy INSERT/UPDATE/DELETE shapes, rolled back).
- Legacy harness (pre-merge code) on B and A2: 365 + 386 requests across 19 properties, writes rolled back; `compare.py` diff.
- New-code harness on A2: 366 requests + Tour App API (5 properties); diff against legacy.
- `rake wayfinding:snapshot` (legacy code) vs `rake wayfinding:compare` (new code): 11 properties identical.
- Rails Minitest: 103 runs / 338 assertions green.
- Cross-version chain: B2 writes via `GraphSave` (edit, detect, svg, stops), `TourStops::Membership`, `TourSetup::Save` on 1411 and 1618 → legacy reads + legacy mobile API → legacy committed writes → new reads + Tour App API → counts/integrity (A3: +4 elevators, +10 hallways, +4 tour_stops, +44 versions; integrity identical).
- Isolation of F2 (hide pending/svg rows, then the bridge nodes, restore); F3 probe (`legacy_keep_point.rb` + `new_graph_check.rb`); legacy FK cascade delete of a Connect node.
- Long-lived legacy process across the migration (`rolling.rb`, `rolling2.rb`).

**Not performed:** anything against live production/Heroku; a browser-rendered (JavaScript) pass of the legacy pages — the server side of every page and the JSON the JavaScript consumes were verified instead, and a signed-in browser pass can be done by the owner on `rails-legacy-audit` (:3200) / `rails-new-audit` (:3100) from `.claude/launch.json`, both pointed at the clone. The clone `pynwheel_audit_clone` is left in place (migrated, with the test writes); drop it with `dropdb pynwheel_audit_clone`. The legacy worktree is at the session scratchpad (`git worktree prune` after it is gone).

---

# Production DB / Legacy Compatibility Decision

## Database Schema Safety
**PASS** — additive only, defaults everywhere, no triggers/functions/views, no FK into legacy tables, 0 pre-migration conflicts.

## Migration Safety
**PASS** — correct order, reversible, 0.5 s DDL, concurrent indexes on the large table, exact round trip proven on production-shaped data.

## Existing Data Integrity
**PASS** — record counts and 15 integrity probes identical before and after; only derived backfill written.

## Legacy Server A
**PASS** — 335 identical fingerprints, every legacy write path succeeds; one rolling-deploy restart required (F5).

## New Server B2
**PASS** — tests green, legacy-shaped output identical, Tour App API serving.

## Shared-DB Coexistence
**PASS with writes OFF · FAIL with Connect writes ON** for properties Server A still serves (F1, F2, F3).

## Map & Plotting
**PASS** (legacy map identical; Connect saves readable) — except pending/SVG rows (F2) and image-less elevators (F1).

## Tour Setup
**PASS** — legacy Tour Setup renders Connect-created stops, order and duration; stop toggles agree both ways.

## SVG Maps
**PASS** — SVG plates (1411, 2934) render identically; SVG-space *hallway rows* must not be written while Server A is old (F2).

## Graph / Paths
**PASS for the legacy graph** (ShortestPath byte-identical on 11 properties) · **FAIL for mixed editing**: Server A-created points are missing from the new graph (F3).

## Overall Deployment Decision
**GO** for `db:migrate` + B2/B1 deploy with `PYN_CONNECT_WRITES=off` (+ Server A restart).
**DO NOT DEPLOY** (do not enable) Connect writes for any property Server A serves until F1, F2, F3 are fixed and re-verified with the scripts in `db_compat_audit/`.

## Critical Findings
F1 image-less Connect elevators break the legacy Elevators page · F2 pending/SVG hallway rows alter legacy routing · F3 legacy-created hallway points invisible to the new graph and its cache version.

## Required Fixes Before Deployment
None for the migration and the writes-off deploy. Before enabling writes: fixes 1–4 in §13; runbook step 5.

## Rollback Plan
`PYN_CONNECT_WRITES=off` (immediate, per-request) → revert the B2 release → only if the schema must go: `db:rollback STEP=11` (12 s; removes all Connect-written graph/stop data; legacy tables untouched — verified).

## Evidence / Tests Performed
§14 and `db_compat_audit/` (scripts, counts, integrity, schema dumps, harness JSON for every run, chain and migration logs).
