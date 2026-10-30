# Property clone: the clone reads the original's uploaded files instead of copying them

Branch `feature/property-clone-shared-files` → `main`. Follow-up to PR #49 / #51.

## Why

A cloned property showed no inventory images and no floor plans on Map & Plotting: every CarrierWave uploader keys its S3 folder on the record id (`uploads/<model>/<field>/<id>/`), and the clone's records have new ids. The owner wants the clone to show the very same files, not copies.

## What

- **Migration** `20261029120000`: nullable integer `file_source_id` on the 30 cloned tables that carry uploads (communities, floorplans, floorplates, sitemaps, units, amenities, elevators, galleries, design tables, ...). NULL means today's behaviour.
- **`SharedSourceStorage`** (prepended to all ten uploaders): `store_dir` resolves through `file_source_id`; `remove!` deletes only objects inside the record's own id folder (so a re-upload or a destroy on a clone never touches the original's objects); `recreate_versions!` is skipped while shared.
- **`SharedSourceFiles`** (ApplicationRecord, before_save): a record's first own upload detaches it, copying its other shown files from the source folder into its own folder (server-side, never overwriting) before clearing the column, so the new file is stored under its own id.
- **Clone**: the Runner sets `file_source_id` on every cloned row (a clone of a clone points at the original); verifier check 12 confirms it; `rake property_clone:share_files[id]` (`MANIFEST=`) backfills clones made before; `COPY_FILES=1` keeps the old copy phase (which then clears the column). `SKIP_FILES` is no longer needed.
- Docs: dependency map (regenerated), runbook, report addendum, context.md §46.

## Verified

- `test/uploaders/shared_source_storage_test.rb` (resolution, delete guard, versions guard, detach-on-upload, plain saves) and `test/services/property_clone/share_files_test.rb` (runner, clone of a clone, backfill), plus the existing clone suite: green.
- On the local pair (Rails :3000 on `pynwheel_audit_clone`, Connect :3001): a fresh Hazel clone (1618 → 8046) passes 14/14 checks; signed in as its admin, Property Inventory shows the floorplate images and Map & Plotting draws the floor plan, all loaded from `uploads/floorplate/image/2241…/` (the original's folders). The Cypress clone 8045 was backfilled with `share_files`.
