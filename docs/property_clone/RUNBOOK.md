# Property clone: production execution and recovery runbook

**Tool:** `rake property_clone:*` (`lib/tasks/property_clone.rake`, services under `app/services/property_clone/`).
**What it does:** copies ONE property (`communities` row), the company it belongs to and every record the property needs, into new rows with new ids, remaps every reference, sanitizes secrets and notification targets, copies the property's S3 folders, verifies the result and writes an audit manifest. The source is only read. See [DEPENDENCY_MAP.md](DEPENDENCY_MAP.md) for what is cloned, excluded and sanitized, and [TEST_ADMIN.md](TEST_ADMIN.md) for the test administrator.

The clone is named `<source name> [SCRIPT TESTING]` under a company named `<source company> [SCRIPT TESTING]`.

## 0. Before anything: what the run needs

| Need | Why |
|---|---|
| A Rails console/dyno on the target environment with the branch deployed | the task runs inside the application (`heroku run -a <app> ...` on Heroku) |
| `S3_BUCKET_NAME` and AWS keys of that environment | only with `COPY_FILES=1` (server-side `CopyObject`); by default the clone reads the source's folders and needs no bucket access |
| The source property id, confirmed by name in the dry run | never hard-coded; passed as the task argument |
| No other clone run for the same property at the same time | the run takes `pg_advisory_xact_lock('property_clone', <source id>)`; a second run waits, then fails as a duplicate |
| A disposable or staging rehearsal done first | section 2 |

The task refuses to write unless every confirmation below is present, so a copy-pasted command cannot run by accident.

## 1. Dry run (reads only)

```bash
bundle exec rake "property_clone:dry_run[<source property id>]"
```

Prints: the connected database and whether it is production-like; source property and company ids and names; the proposed names; every table with the source row count, the expected clone count, predicted skips (rows whose referenced record no longer exists) and cleared references; the S3 folders to copy; the excluded records with their counts; the conflicts (a company already carrying the clone name, a suffixed region/group name taken, the source being a clone itself). Writes `tmp/property_clones/<stamp>-property-<id>-dry_run.json`.

Read it with the owner. Stop if the conflicts list is not empty, if an expected count is not what the property should have, or if a note says the property has no tour or more than one.

## 2. Rehearsal (mandatory before production)

On a copy of production (`createdb -T` or a Heroku fork/`pg:copy` into a staging database):

```bash
# dry run, then execute (files are shared with the source by default; COPY_FILES=1 copies them instead)
PROPERTY_CLONE_EXECUTE=1 CONFIRM_DATABASE=<db name> CONFIRM_SOURCE=<id> \
  bundle exec rake "property_clone:execute[<id>]"
# bootstrap the test administrator (non-production: a password may be supplied)
PROPERTY_CLONE_EXECUTE=1 CONFIRM_DATABASE=<db name> TEST_ADMIN_EMAIL=test@gmail.com TEST_ADMIN_PASSWORD=Testing123 \
  bundle exec rake "property_clone:test_admin[<clone company id>,<clone property id>]"
# a clone made with CLONE_SUFFIX=" ..." needs the same CLONE_SUFFIX on test_admin and share_files
# drive the clone through the real routes and compare the source fingerprint
MANIFEST=tmp/property_clones/<execute manifest>.json ADMIN_EMAIL=test@gmail.com \
  bundle exec rails runner script/property_clone/isolation_rehearsal.rb
```

Every line of the verification and of the rehearsal must read PASS. The rehearsal of October 28, 2026 (Hazel 1618 on `pynwheel_audit_clone`) is in [REPORT_2026-10-28.md](REPORT_2026-10-28.md).

## 3. Production execution

1. **Freeze**: tell the team no one edits the source property during the run (the run reads the source once; concurrent edits are not corrupted, but the fingerprint check 11 would then report a difference that is not the script's).
2. **Baseline** (optional, read-only; the execute step takes its own):
   ```bash
   bundle exec rake "property_clone:baseline[<id>]"
   ```
3. **Dry run** again on production and compare with the rehearsal's dry run (same counts, no conflicts).
4. **Execute**. On a production-like database every one of these is required:
   ```bash
   PROPERTY_CLONE_EXECUTE=1 \
   CONFIRM_DATABASE=<the database name printed by the dry run> \
   CONFIRM_SOURCE=<id> \
   ALLOW_PRODUCTION=1 CONFIRM_PRODUCTION=<the same database name> \
     bundle exec rake "property_clone:execute[<id>]"
   ```
   Order of events: environment check → plan → `pg_advisory_xact_lock` → duplicate check → one transaction copying every table in dependency order (new ids, remapped references, sanitized columns, `file_source_id` = the source row) → second pass (self references, `deleted_ids`, `next_points`, `sort_hash`, favourites) → COMMIT → integrity verification (14 checks) → manifest. With `COPY_FILES=1` an S3 folder copy with `*_url` rewrite runs after the verification.
   A failure before COMMIT rolls everything back and writes a `rolled_back` manifest; nothing is left behind. A failure in the optional file phase leaves the database clone in place: the manifest lists each folder's status, and the phase can be re-run (it never overwrites an object that already exists).
5. **Verify**: the task prints the 13 checks and exits non-zero if any FAIL. Re-run later at any time:
   ```bash
   MANIFEST=tmp/property_clones/<execute manifest>.json bundle exec rake "property_clone:verify[<id>]"
   ```
   On Heroku copy the manifest off the dyno (`heroku run` dynos have their own disk): `cat` it or `heroku run ... > file`; keep it with the change ticket. It contains the full source-to-clone id map and no secret or personal data.
6. **Test administrator** (production): no password is accepted; the account gets a random password and a one-time Devise reset link written to a 0600 file on the dyno. Copy the link to the administrator over a trusted channel and delete the file.
   ```bash
   PROPERTY_CLONE_EXECUTE=1 CONFIRM_DATABASE=<db> TEST_ADMIN_EMAIL=test@gmail.com HOST_URL=https://<cms host> \
     bundle exec rake "property_clone:test_admin[<clone company id>,<clone property id>]"
   ```
   If `test@gmail.com` already exists the task reports it and changes nothing; pick another address or ask the owner.
7. **Unfreeze** and hand the clone's property id, company id and the manifest to the owner.

## 4. What the clone can and cannot do (by policy)

- It cannot reach a PMS/CRM: `data_provider` and the credential identifiers/secrets are cleared, so the scheduled importers skip it and no lead/prospect can be pushed.
- It cannot operate a lock: no lock vendor account or device row is copied; per-stop `lock_provider` stays as configuration, access codes are cleared.
- It cannot notify anyone from the source: property/company e-mail and phone, property-manager contact, eBrochure sender/BCC are cleared; chat is off.
- It cannot charge: card requirement and the ID-verification fee are off.
- It has no visitors, bookings, visit history, favourites, residents, allowed e-mails, partner map keys, analytics or audit history (the owner can approve copying bookings/visitors separately; the policy would need a step for that).
- Its images, floor plans and maps are the source's own S3 objects, read through `file_source_id` (`SharedSourceStorage`). The clone can never delete or overwrite them: deleting a cloned record leaves the shared folder alone, cropping is skipped while shared, and the first new upload on a cloned record copies its other files into its own folder before storing. A clone made before October 29, 2026 is pointed at the source folders with `rake property_clone:share_files[<id>]` (`MANIFEST=` its execute manifest). With `COPY_FILES=1` the clone owns copies instead.
- Its `kiosk code` (`communities.code`) is empty (unique across properties and groups); set one if the Touch kiosk should be tested.

## 5. Recovery

**Rolled back run** (`status: rolled_back` manifest): nothing was written; fix the cause (the manifest's `error`), re-run.

**Committed clone that must be removed**: the clone is an ordinary company with one property. Removing it is the ordinary company deletion, applied to the CLONE ids only (take them from the manifest, never from a name search):

```ruby
# rails console, after confirming the ids against the manifest
manifest = JSON.parse(File.read('<manifest>'))
clone_company = Company.find(manifest['clone']['company_id'])
raise 'not a clone' unless clone_company.name.end_with?(' [SCRIPT TESTING]') && clone_company.communities.pluck(:id) == [manifest['clone']['property_id']]
clone_company.delete_company      # CompanyDestroyWorker: dependent: :destroy over the company's properties
```

Objects under the source ids are never touched by that destroy (shared folders are skipped by the uploaders); only files the clone uploaded itself, under its own ids, are deleted. The test administrator (`users` row + `community_users`) is removed with the company (`dependent: :destroy`).

**Partial file phase**: re-run only the file phase from a console:

```ruby
manifest = JSON.parse(File.read('<manifest>'))
plan = PropertyClone::Plan.new(manifest['source']['property_id'], suffix: manifest['suffix'], options: { allow_clone_users: true }).resolve!
entries = PropertyClone::FileCopier.plan(plan, PropertyClone::IdMap.from_h(manifest['id_map']))
PropertyClone::FileCopier.new(entries, bucket: ENV.fetch('S3_BUCKET_NAME'), client: Aws::S3::Client.new, plan: plan, logger: $stdout).run!.summary
```

**Source integrity doubt**: `property_clone:compare_baseline[<id>]` with `BASELINE=` the baseline file (or the `baseline` object of the manifest saved to a file) reports every digest that differs.

## 6. Limits and open points

- No persistent clone marker exists in the schema: idempotency rests on the company name suffix (a second run for the same source is refused while a `<company> [SCRIPT TESTING]` company exists) and on the manifest. A `property_clones` audit table (source id, clone id, manifest, run status) would make this robust against renames; it needs a migration and the owner's approval.
- `created_at`/`updated_at` are copied from the source rows.
- `CloneCommunityJob` (the legacy "Clone Community" button) is untouched; it copies only the community row and its design, into the same company, and is not what this task does.
- The optional copy phase (`COPY_FILES=1`) cannot be rehearsed without bucket access; it is covered by unit tests with a fake S3 client. The shared-folder default needs no bucket access and is covered by `test/uploaders/shared_source_storage_test.rb`.
