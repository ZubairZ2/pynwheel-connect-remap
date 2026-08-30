# Student Housing — Floor-plan & Unit-space Pop-up (two-pop-up design)

**Ticket:** Student housing floor-plan & unit pop-ups (two-pop-up design)
**Shipping for:** Entrata / PSI, student-housing properties only
**Built so that:** a second provider is one adapter file, and a new pop-up field is one
key — see §8.
**Display toggle:** `communities.student_housing_property`
**Depends on:** [student-housing-unit-space-grouping-plan.md](student-housing-unit-space-grouping-plan.md) — shipped; this builds on `SdkUnitSpaceGrouper` and `unitGrouping.mode == "spaces"`.
**Verified against:** community 34 (Troubadour), both feeds called live — see §13.
**Progress** (branch `student-housing-space-popup`, both repos):

| # | Step | State |
|---|---|---|
| 1 | §4.5 deep-link `property[id]` fix | **done** — 671/671 links corrected, verified through a real sync |
| 2 | Migration + `UnitSpaceDetail` model | **done** |
| 3 | `SpaceRecord`, policies, Entrata adapter, `Collector` | **done** — 671 rows, baseline of 22, chips match the mockup |
| 4 | Collector wired into the 3 sync services | **done** — verified by running `PsiService#perform` for real (35s) |
| 5 | `spaceConfig` serialization | **done** — 46 floor plans, 127 letters, 0 dangling ids; toggle-off payload byte-identical |
| 6 | SDK `hasSpaceConfig` / `getFloorplanSpaceConfig` / `getSpaceLetters` | **done** — additive only, 19 checks pass |
| 7 | React: retire prototypes, `resolveDetailModal`, `SpaceModal` | **not started** — see §8 |

**Status:** approved for development. Four open decisions were settled on 2026-08-25:

| Decision | Settled |
|---|---|
| Apply Now / Virtual Tour missing on community 34 | **Build both**, rendered on data presence; enabling `apply_now` and adding tour URLs is a launch-checklist item, not a code change (§13.3) |
| Malformed `property[id]` in the Entrata deep link | **Fixed in this ticket** as a prerequisite — §4.5 |
| Favourite in the pop-up header | **Floor-plan favourite**, as in the mockup — no new favourites work (§7.5) |
| Mocked student-housing path in React | **Deleted**, in the same release as `SpaceModal` (§8.1) |

**Scope:** `PsiService` / `PsiStaticService` / `PsiSwapService` → new `UnitSpaceDetails`
pipeline → `unit_space_details` table → `SdkPayloadBuilderService` → `pyn-map-sdk-v1.js`
→ `pynwheel-maps` (React).

**Out of scope:** `pyn-map-sdk.js` (v0), `webpages.js` (old CMS map), every non-Entrata
provider *as a shipped integration*, per-space markers on the floor-plan image (deferred
by the AC).

---

## 0. The one-paragraph version

The two Entrata feeds we already pull every day carry three things we currently throw
away: **per-space amenity descriptions**, **lease start/end dates per term**, and the
**space letter** (A/B/C/D). We start persisting those into a new side table keyed on the
provider's space id, on **every** Entrata sync — no toggle, no property-type check: if the
feed carried it we store it, and if it did not we store nothing. The SDK payload then exposes
a precomputed, **floor-plan-scoped** `spaceConfig` block — one entry per letter, with its
availability count, premium chips, rent and lease dates — and *that* is where the Student
Housing toggle is checked, once. The React app renders the block when it is present.

Everything from the raw feed up to the table goes through a **provider adapter**; everything
from the table up to the browser is **provider-agnostic and does not know Entrata exists**.
We implement exactly one adapter. **No new API calls, no new columns on `units`, no change
to any non-Entrata code path.**

---

## 1. What the feeds already give us, and what we drop

Both calls below are **already made on every daily sync**. Nothing here adds a request.

### Feed A — ILS / MITS · `getMitsPropertyUnits`

Pulled in [psi_service.rb:67](../app/services/psi_service.rb#L67), twice per property
(`get_limit_result_availability` returns `[false, true]`). With
`entrata_show_unit_spaces = "1"` each `ILS_Unit` **is one leasable bedroom**.

| Path | Today | Needed |
|---|---|---|
| `ILS_Unit/Identification/IDValue` | 2nd half of `provider_unit_id` | **join key** — persist explicitly |
| `ILS_Unit/Units/Unit/Identification/IDValue` | 1st half of `provider_unit_id` | — |
| `ILS_Unit/Units/Unit/MarketingName` | `units.marketing_name` | letter fallback |
| `ILS_Unit/Identification/OrganizationName` | **dropped** | **space letter** — 3rd `~..~` segment, **lowercase** (§13) |
| `ILS_Unit/Amenity[]/Description` | **dropped** | **premium features** |
| `ILS_Unit/Availability/VacancyClass` | `units.availability` | availability count |
| `ILS_Unit/Availability/UnitAvailabilityURL` | `units.availability_url` | Apply Now |
| `ILS_Unit/Units/Unit/@attributes/FloorPlanId` | `units.floorplan_id` | pop-up scope |
| `Floorplan/FloorplanAvailabilityURL` | `floorplans.availability_url` | Apply Now fallback |

`Amenity` sits at the **`ILS_Unit` top level** — verified on community 34 (§13), where every
one of 671 spaces carries an `Amenity` array of `{"@attributes":{"AmenityType":"Other"},
"Description":"…"}`. Keep a fallback read of `ILS_Unit["Units"]["Unit"]["Amenity"]` anyway:
Entrata's MITS serialisation has moved it across versions, and a wrong guess fails silently as
"no premium features anywhere", which is indistinguishable from a correctly-baselined property.

`OrganizationName` is `"{propertyId}~..~{unitId}~..~{letter}"` — e.g.
`"100152889~..~4455543~..~a"`. It appears identically on `ILS_Unit/Identification` and
`ILS_Unit/Units/Unit/Identification`; read the former, which is the `UnitSpaceID`-scoped
record. **The letter is lowercase and must be upcased.**

### Feed B — Space configuration · `getUnitsAvailabilityAndPricing`

Pulled in `fill_psi_pricing_details` → `get_units_pricing`
([psi_service.rb:388](../app/services/psi_service.rb#L388)) with
`useSpaceConfiguration` and `showUnitSpaces` from the credential. Shape:
`PropertyUnits/PropertyUnit[]/UnitSpace[]/Rent/TermRent[]/@attributes`.

| Path | Today | Needed |
|---|---|---|
| `UnitSpace/@attributes/Id` | one of 8 lookup fallbacks | **join key** — persist explicitly |
| `UnitSpace/@attributes/UnitNumber` | dropped | **space letter**, already uppercase — a third source that agrees (§13) |
| `UnitSpace/@attributes/AvailableOn` | `units.available_date` | — |
| `UnitSpace/@attributes/SpaceConfiguration` | dropped (kept only in the *connection-test* services) | space option |
| `TermRent/@attributes/Rent` | folded into the `lease_pricing` string | **price per space** |
| `TermRent/@attributes/StartDate` | **dropped** | **lease dates + academic year** |
| `TermRent/@attributes/EndDate` | **dropped** | **lease dates + academic year** |
| `TermRent/@attributes/SpaceOption` | dropped | space option |
| `TermRent/@attributes/LeaseTerm` | `lease_pricing` key | **deliberately unused** (see §5.3) |

`update_unit_pricing_and_availability`
([psi_service.rb:608](../app/services/psi_service.rb#L608)) already walks every
`TermRent` row and keeps only `LeaseTerm:Rent`. The dates are in the hash it is holding
and are discarded one line later. That is the entire cost of this feature on the wire:
zero.

### The join

`UnitSpace/@attributes/Id` (Feed B) `==` `ILS_Unit/Identification/IDValue` (Feed A) `==`
the Entrata **UnitSpaceID**. **Measured on community 34: 671 ids on each side, 671 matched,
zero unmatched either way** (§13). `ILS_Unit/Identification/@attributes/IDType` literally
reads `"UnitSpaceID"`.

**`UnitSpace` is a Hash, not an Array.** On community 34 all 276 `PropertyUnit`s carry it as a
Hash — which is why the existing code writes `u['UnitSpace'].each { |us| us[1][...] }`, taking
the value out of a `[key, value]` pair. The adapter must handle both shapes
(`sp.is_a?(Hash) ? sp.values : Array(sp)`) rather than inheriting that idiom.

We do **not** reuse that matcher. It tries eight key shapes in sequence and ends with
`@all_units_hash.select { |k,_| k.include?(unit_id) }.values[0]` — a substring scan that
will happily return the wrong bedroom. Good enough for "which unit gets this rent",
actively dangerous for "which bedroom gets these premium amenities", because a mis-join
here shows a visitor an en-suite that the room they lease does not have. The new code
joins on the persisted `provider_space_id` **only**, and counts the misses (§6.4).

---

## 2. Where the data lives — a new table, not new columns

### The decision

New table **`unit_space_details`**, one row per `Unit` (= per bedroom), `unit_id` unique.
No new columns on `units`.

### Why not columns on `units`

Three independent reasons, any one of which is sufficient:

1. **`units` is the hot table.** `SdkPayloadBuilderService#build` loads every column of
   every visible unit on every map load, and the grouping plan's whole justification was
   that this is already the dominant cost on a student property. An amenity array is ~22
   strings ≈ 600 B per row; on a 1,000-bedroom property that is ~600 KB of extra row
   width read on **every** payload build — including for the ~99% of properties that will
   never turn this feature on. A side table is read only when the toggle is on.

2. **`ProvidersDataUpdationService#update_existing_units_records` writes every column.**
   It bulk-imports with `columns: Unit.column_names - [:pointer_data]`
   ([providers_data_updation_service.rb:101](../app/services/providers_data_updation_service.rb#L101)).
   A new column on `units` is therefore written by **every provider service** — Yardi,
   RealPage, RentCafe, AppFolio, RentManager, XML, Zaremba — on every sync of every
   property. It would work (the objects are AR-loaded, so they'd rewrite their own
   values), but "this Entrata feature is safe because eight unrelated importers happen to
   round-trip it correctly" is not a guarantee, it is a coincidence. With a side table,
   **not one line of any other provider's code is touched**, which is the requirement.

3. **UC 08 / PYN-1638 is coming.** That ticket makes unit spaces real child rows. A table
   already keyed on "one row per space, joined to the provider's space id" becomes that
   table's ancestor with a rename and a backfill. Columns bolted onto `units` become a
   second migration to unpick.

### Schema

Provider-neutral by construction — nothing below says "Entrata", and the two Entrata-shaped
concepts (`provider_space_id`, `space_option`) are named for what they *mean*, not for where
they came from.

```ruby
# db/migrate/2026XXXXXXXXXX_create_unit_space_details.rb
create_table :unit_space_details do |t|
  t.references :unit, null: false, index: { unique: true }, foreign_key: { on_delete: :cascade }
  t.integer :community_id, null: false            # baseline scope + prune, no FK (units.community_id has none either)
  t.string  :provider, null: false                # "psi" today; the adapter that wrote the row
  t.string  :provider_space_id                    # the PMS's own id for this leasable space — the join key
  t.string  :space_letter                         # "A" / "B" — nil when the feed names no letter
  t.string  :space_option                         # occupancy / configuration label, verbatim from the feed

  t.jsonb :amenities,         null: false, default: []   # every description the feed gave, normalised
  t.jsonb :premium_amenities, null: false, default: []   # the sub-100% subset (§5.2)
  t.jsonb :lease_terms,       null: false, default: []   # [{rent, start_date, end_date, raw_term, space_option}]
  t.jsonb :metadata,          null: false, default: {}   # provider-specific extras — see below

  t.date    :lease_start_date                     # chosen term (§5.3), denormalised
  t.date    :lease_end_date
  t.decimal :space_rent, precision: 10, scale: 2
  t.datetime :synced_at

  t.timestamps
end

add_index :unit_space_details, [:community_id, :space_letter]
add_index :unit_space_details, [:community_id, :provider_space_id]
add_index :unit_space_details, [:community_id, :provider]
```

Four things worth defending:

- **`amenities` *and* `premium_amenities`.** The premium set is derived, and the baseline
  is recomputed on every pull (§5.2). Keeping the raw list means the rule can be re-run,
  audited, or fixed without waiting for a feed pull — and when a property manager asks
  "why is *Walk-in Closet* not showing as premium", the answer is one query away instead
  of one API call away. The raw list costs bytes in a table nothing else reads.

- **`lease_start_date` / `lease_end_date` / `space_rent` denormalised out of
  `lease_terms`.** The pop-up shows exactly one term. Choosing it is a rule with
  branches (§5.3); running that rule per bedroom on every map load, in Ruby, is precisely
  the kind of per-row work the grouping plan spent its effort removing. Resolve once at
  sync time, serialise a column.

- **`metadata` is the escape hatch, and it has a rule.** Provider-specific values that
  nothing renders yet go here, so adding a provider never needs a migration. Anything the
  pop-up actually *displays* gets a real column, because a rendered field needs a type, an
  index and a name that survives a rename in someone else's API. The rule in one line:
  **if the client reads it, it is a column; if only an adapter or an audit reads it, it is
  `metadata`.** Without that rule this field becomes the place schema goes to die.

- **`provider` is stamped per row, not inferred from the community.** A property can be
  swapped between providers (`PsiSwapService` exists for exactly that), and during a swap
  rows from both will briefly coexist. The row knows who wrote it.

Model:

```ruby
class UnitSpaceDetail < ApplicationRecord
  belongs_to :unit
  scope :for_community, ->(id) { where(community_id: id) }
  scope :lettered,      -> { where.not(space_letter: nil) }
  def premium? = premium_amenities.present?
end

# app/models/unit.rb
has_one :unit_space_detail, dependent: :destroy
```

`dependent: :destroy` **and** the FK's `on_delete: :cascade`: units are deleted both
through AR and through raw SQL (`CleanPsiDataService` uses `delete_all`, which skips
callbacks; the clean-up rake tasks go lower still). Only the FK catches both.

---

## 3. The provider seam

This is the part the "don't tie it to one provider" requirement buys, so it is worth being
precise about **where** the seam is and, just as much, where it is not.

### 3.1 The shape

```
  Entrata feed JSON
        │
        ▼
  UnitSpaceDetails::Adapters::Entrata      ← the ONLY file that knows a JSON path
        │   emits
        ▼
  UnitSpaceDetails::SpaceRecord            ← the contract
        │
        ▼
  UnitSpaceDetails::Collector              ← accumulate · baseline · resolve term · upsert
        │   (+ PremiumAmenityPolicy, LeaseTermPolicy)
        ▼
  unit_space_details                       ← provider-neutral rows
        │
        ▼
  SdkPayloadBuilderService  →  pyn-map-sdk-v1.js  →  pynwheel-maps
        └────────── none of these know which PMS the data came from ──────────┘
```

Files:

```
app/services/unit_space_details/collector.rb                UnitSpaceDetails::Collector
app/services/unit_space_details/space_record.rb             UnitSpaceDetails::SpaceRecord
app/services/unit_space_details/premium_amenity_policy.rb   UnitSpaceDetails::PremiumAmenityPolicy
app/services/unit_space_details/lease_term_policy.rb        UnitSpaceDetails::LeaseTermPolicy
app/services/unit_space_details/adapters.rb                 UnitSpaceDetails::Adapters.for(provider)
app/services/unit_space_details/adapters/entrata.rb         UnitSpaceDetails::Adapters::Entrata
```

### 3.2 `SpaceRecord` — the contract

A plain immutable struct. Provider-neutral vocabulary, nothing optional-by-accident:

```ruby
SpaceRecord = Struct.new(
  :provider_space_id,   # the PMS's id for this leasable space — the merge key
  :provider_unit_id,    # how to find our Unit row (matches units.provider_unit_id)
  :space_letter,        # "A", or nil
  :space_option,        # occupancy/configuration label, or nil
  :amenities,           # [String] — raw descriptions, un-normalised
  :lease_terms,         # [{rent:, start_date:, end_date:, raw_term:, space_option:}]
  :metadata,            # provider-specific extras
  keyword_init: true
)
```

Every field is optional except `provider_space_id`. A provider that gives amenities but no
lease terms, or lease terms but no letter, produces valid records — the collector merges
whatever arrives and the serializer omits what is missing. That is what lets a second
provider land partially rather than all-or-nothing.

### 3.3 The adapter interface

One method. Feeds are named for **what they carry**, not for the endpoint that carried it:

```ruby
module UnitSpaceDetails::Adapters
  # :catalog — identity, letters, amenities, availability
  # :pricing — lease terms, rents, dates
  # A provider whose single feed carries both implements :catalog only and returns
  # lease_terms in the same records; the collector does not care.
  def self.for(provider) = REGISTRY.fetch(provider, nil)

  REGISTRY = { "psi" => Entrata }.freeze
end

class UnitSpaceDetails::Adapters::Entrata
  def initialize(community, credentials)
  def extract(payload, feed:)   # -> [SpaceRecord]
end
```

`Adapters.for` returning `nil` is the "this provider is not supported" answer, and it is
the **only** gate the import needs. `provider == "psi"` never appears in the collector, the
serializer, the SDK or the React app — supporting Yardi is a registry line, not a grep.

### 3.4 What is deliberately *not* abstracted

Flexibility that costs nothing is worth having; flexibility that costs a layer is worth
justifying. Three things stay concrete on purpose:

- **The call sites.** `PsiService`, `PsiStaticService` and `PsiSwapService` each get three
  lines (§4.3). No shared base class, no callback registry, no "sync pipeline" — those
  three services are already near-duplicates and unifying them is a real refactor with a
  real blast radius that has nothing to do with this feature.
- **The policies are classes, not configuration.** `PremiumAmenityPolicy` and
  `LeaseTermPolicy` are swappable because a second provider may genuinely need a different
  rule, but there is no options hash, no per-property override UI, no DSL. When someone
  needs a second rule they write a second class and the diff shows what changed.
- **One adapter is written.** Not a base class with one subclass — `Adapters::Entrata` is a
  standalone class satisfying an interface described in a comment. The abstract parent gets
  extracted when there are two implementations to extract it *from*, which is the only time
  the shared parts are actually known.

### 3.5 Why this is not speculative

The usual objection to an adapter seam for a single implementation is that the second case
never arrives, or arrives shaped differently. Here the second case is already in the repo:
`BaseService#yardi_rent_cafe_property_rent_matrix`
([base_service.rb](../app/services/base_service.rb)) already returns, per apartment,
`[rent, term, start_Date, end_Date]` — the exact contents of `SpaceRecord#lease_terms`, from
RentCafe V2, today. Whoever picks up the next provider is mapping data we already fetch,
into a struct that already exists.

---

## 4. Import — where it hooks in

### 4.1 Which properties import — and the rule that governs it

**The import layer has no toggle and no property-type check. It stores what the feed gave it,
and nothing when the feed gave nothing.**

That is the rule, and it is worth stating as a rule rather than as three conditions, because
every condition added below the table is a bug waiting to happen: a property manager flips
the Student Housing toggle, the pop-up is empty for up to 24 hours, and nobody can tell
whether the feature is broken or the sync simply has not run.

| Stage | Gate | Nature of the gate |
|---|---|---|
| **Import** into `unit_space_details` | the adapter produced a record with content | **data presence only** |
| **Serialise** into the SDK payload | `community.student_housing_property?` | the toggle, checked once |
| **Render** the new pop-up | `hasSpaceConfig()` | payload shape |

Three consequences, all deliberate:

- **The sync never asks what kind of property this is.** No `student_housing_property?`, no
  `enable_unit_type_pricing?`, no `entrata_show_unit_spaces` branch inside the collector. The
  adapter parses the response it was handed; whatever is in there gets stored. A property with
  unit spaces switched off yields no letters and no terms — so nothing is written, without
  anyone having asked a question about it.
- **`Adapters.for(provider)` is a capability lookup, not a condition on the property.** It
  answers "can I parse this shape", and returning `nil` makes every collector method a no-op.
  It lives in the registry, not in an `if` at a call site.
- **Flipping the toggle is instant.** The data is already there, so the next payload carries
  `spaceConfig`. No sync, no backfill, no waiting — which is what makes the toggle a genuine
  rollback lever in both directions. It also means the audit task (§10) has real data to check
  *before* anyone commits to enabling anything.

**Empty records are not written.** A row earns its place by carrying at least one of
`amenities`, `space_letter`, `lease_terms`. A conventional Entrata property — one space per
unit, no letters, no per-space amenities — therefore produces **zero rows**, not a thousand
blank ones. This is the same "store it if it has data" rule applied per row, and it is what
keeps the table proportional to the properties that actually use the feature.

### 4.2 `UnitSpaceDetails::Collector`

One object, instantiated per sync, fed from both feeds, flushed once.

```ruby
collector = UnitSpaceDetails::Collector.new(community, credentials)
collector.absorb(payload, feed: :catalog)   # no-op when no adapter is registered
collector.absorb(payload, feed: :pricing)
collector.flush!
```

`absorb` runs the adapter and merges the resulting records into a
`{provider_space_id => SpaceRecord}` accumulator. `flush!` is the only method that computes
anything or touches the database.

Why accumulate rather than write as we go: the premium baseline is **a property-wide
frequency count** (§5.2), so nothing can be decided until every space has been seen. And the
catalog feed is pulled **twice** (`availableUnitsOnly` false then true) — per-space writes
would run twice, and the second pass, which sees only available bedrooms, would compute a
baseline over a subset and silently promote ordinary amenities to premium. The collector
merges across both passes and both feeds, and writes once.

`flush!` applies the §4.1 rule at the row level: a record is written only if it carries at
least one of `amenities`, `space_letter`, `lease_terms`. Everything else is dropped, so the
table stays proportional to the properties that actually have space data.

**The collector asks no questions about the property.** Not `student_housing_property?`, not
`enable_unit_type_pricing?`, not `entrata_show_unit_spaces`. When `Adapters.for` returns
`nil` every method is a no-op, and a caller never asks whether the provider is supported —
that is the only capability check in the whole import path, and it lives in the registry.

### 4.3 Call sites

| Service | Runs | `ILS_Unit` loop | `UnitSpace` loop |
|---|---|---|---|
| [psi_service.rb](../app/services/psi_service.rb) | daily | `perform`, ~L88 | `unit_space_enabled_pricing_update`, [L565](../app/services/psi_service.rb#L565) |
| [psi_static_service.rb](../app/services/psi_static_service.rb) | first import | `perform`, ~L40 | [L325](../app/services/psi_static_service.rb#L325) |
| [psi_swap_service.rb](../app/services/psi_swap_service.rb) | provider switch | `perform`, ~L40 | [L371](../app/services/psi_swap_service.rb#L371) |

Each gets the same three additions: build the collector, `absorb(…, feed: :catalog)` in the
`ILS_Unit` loop, `absorb(…, feed: :pricing)` in the `UnitSpace` loop, `flush!` at the end.
All three already have a `unit_space_enabled_pricing_update` with an identical inner loop, so
the insertion point is the same shape in all three.

Concretely, in `PsiService#perform`:

```ruby
collector = UnitSpaceDetails::Collector.new(community, @credentials)

@credentials&.get_limit_result_availability()&.each do |limit_result|
  property_ids.each do |property_id|
    ...
    collector.absorb(response, feed: :catalog)          # + one line
    ...
  end
  fill_psi_pricing_details(limit_result, collector) unless community.enable_unit_type_pricing?
end

fill_unit_type_pricing_details(community) if community.enable_unit_type_pricing?
collector.flush!                                        # + one line
before_updation_units.compare_status_and_notify()
```

plus one `collector.absorb(response, feed: :pricing)` inside `unit_space_enabled_pricing_update`.
**Every existing line stays where it is.** The diff is additive: no existing statement is
moved, reordered, or rewritten.

### 4.4 The `enable_unit_type_pricing?` hole

`fill_psi_pricing_details` — the only caller of the space-config feed — is **skipped** when
`community.enable_unit_type_pricing?` is true
([psi_service.rb:110](../app/services/psi_service.rb#L110)). Those properties price off
`getUnitTypes`, which is floor-plan-level and carries no space-level lease dates.

For such a property this feature imports amenities and letters but no dates or per-space
rent. **We accept that, and add no call.**

An earlier draft proposed making one extra `getUnitsAvailabilityAndPricing` call when the
property was *also* student housing. That is exactly the fetch-level toggle check §4.1 rules
out: it would make the sync's network behaviour depend on a display setting, so flipping the
toggle would silently change which endpoints we hit — and the property would then need a full
sync before the pop-up could show a price. Dropped.

The result is the partial-record case §3.2 was designed for: the space rows carry amenities
and letters, `lease_start_date` / `lease_end_date` / `space_rent` are null, and the pop-up
renders without a price panel (§8.4 renders every section on the presence of its data). No
branch, no exception, no extra request.

If one of these properties ever needs the price panel, the fix belongs in the sync's own
configuration — pulling the space-config feed for that property unconditionally — not in a
condition on what the map happens to display.

### 4.5 Prerequisite fix — the Apply Now deep link's `property[id]`

Small, in scope, and landing **before** the pop-up ships. Not a deferred nicety: the new
pop-up makes Apply Now its primary action, and it currently points at a malformed URL.

`set_availability_url` ([psi_service.rb](../app/services/psi_service.rb)) reads both ids from
the same node:

```ruby
property_id   = u.dig('Identification', 'IDValue')   # UnitSpaceID — wrong
floor_plan_id = u.dig('Units', 'Unit', '@attributes', 'FloorPlanId')
unit_id       = u.dig('Identification', 'IDValue')   # UnitSpaceID — correct
```

so community 34 emits `…/property[id]/4814372/…/unit_space[id]/4814372/…` where Entrata expects
the property id `100152889`. `unit_space[id]` is right, so the link targets the correct space;
only the property segment is wrong.

The fix reads the property id from the response's `PropertyID/Identification` (or, equivalently,
the `propertyIds` the request was made with) and threads it into the builder. It is one
assignment.

**Blast radius is every Entrata property**, since they all build this URL — which is exactly why
it gets its own commit, its own before/after URL diff on two properties, and lands ahead of the
serializer work rather than inside it. The same three services call it, so verifying one covers
all three.

Explicitly **not** in this fix: `term_month/12` and `lease_start_date` still come from the old
sources. Enriching those from the newly-stored `lease_terms` is a real improvement and stays
deferred (§12) — it changes what the link *means*, not whether it is well-formed.

---

## 5. The three derivations

All three live below the adapter seam, so they apply identically to any future provider —
and each is a named class, so a provider that needs a different rule replaces one object
instead of forking the pipeline.

### 5.1 Space letter — `SpaceRecord#space_letter`, filled by the adapter

Order of preference, first non-blank wins:

1. `ILS_Unit/Identification/OrganizationName`, split on `~..~`, **third** segment, upcased,
   when it is 1–2 letters. (Split on the full `~..~` separator, not on `~`.)
2. Feed B's `UnitSpace/@attributes/UnitNumber`, already uppercase.
3. `MarketingName` trailing letter, via the convention already encoded in
   `SdkUnitSpaceGrouper.apartment_number` — `"115-A"` → `"A"`, `"12B"` → `"B"`.
4. `nil`.

All three agree on all 671 spaces of community 34 — zero nils, zero mismatches (§13) — so 2
and 3 are genuinely fallbacks rather than tie-breaks. Letters run **A–E**; the tab count is
the bedroom count, and this property has 5-bedroom floor plans.

Step 1 is Entrata-specific and lives in the adapter. Step 2 is not: it is the same regex the
grouper uses to derive a *door* name by stripping that suffix. If the two rules ever
disagree, a door labelled `115` shows a tab set that does not correspond to its own
bedrooms. One regex, exported as `SdkUnitSpaceGrouper.space_letter(name)` next to
`apartment_number`, and available to every future adapter.

A `nil` letter is not an error — a conventional property has one space per unit and names no
letter. Those rows import with `space_letter: nil` and produce no `spaceConfig` (§6.2),
which is exactly right.

### 5.2 `PremiumAmenityPolicy` — the frequency baseline

Per property, per pull, **recomputed from scratch, never hardcoded**:

```
spaces_with_amenities = rows where amenities.any?
freq[description]     = number of those spaces carrying it
baseline              = { d | freq[d] == spaces_with_amenities.size }
premium(space)        = space.amenities - baseline
```

Details that matter:

- **Normalise before counting**: `strip`, collapse internal whitespace, compare
  case-insensitively. Keep the first-seen original spelling for display. Without this,
  `"En-Suite Bathroom"` and `"En-Suite Bathroom "` count as two descriptions, neither hits
  100%, and both become false premiums on every space — the failure mode is *every tab
  crowned*, which looks like a working feature.
- **Denominator excludes amenity-less spaces.** A bedroom the feed gave no amenity block for
  is missing data, not a bedroom lacking every amenity. Counting it would drop the baseline
  below 100% for everything and, again, crown everything.
- **Fewer than 2 amenity-carrying spaces** → every description is at 100% → baseline is
  everything → no premiums. Falls out of the arithmetic; no special case, and it is the safe
  answer (show nothing rather than invent a distinction from one sample).
- **Scope is the property, not the floor plan.** The brief says property, and it is right: an
  amenity present on every space in a floor plan but not elsewhere on the property *is* a
  real differentiator for that floor plan.
- The `*…Select Units` marketing amenities named in the AC are excluded by this rule because
  they appear on 100% of spaces. **This is an assertion about the data, not the code.** §9's
  audit task verifies it on the real property before anything is enabled.

`crown = premium_amenities.any?` — one derived predicate, computed nowhere else.

### 5.3 `LeaseTermPolicy` — which term the pop-up shows

The feed gives several term rows per space; the pop-up shows one. The rule:

1. Drop rows missing `start_date` or `end_date` — an undated row cannot answer the question
   the panel asks.
2. Prefer the row with the **earliest start date in the future** — the next academic year,
   which is what a student browsing in spring is shopping for.
3. Otherwise the row **currently in effect** (`start <= today <= end`).
4. Otherwise the row with the **latest start date**.
5. Tie-break within a step on **lowest rent**, then **longest duration**.

Steps 2–3 mirror `next_year_pricing_available?` / `current_year_pricing_available?`, which
already exist in `PsiService` for the unit-type path and already encode "next year if we
have it, else this year" — plus the `community.turn_availability_on` gate that decides
whether next-year pricing is advertised at all. **Reuse that gate**, so a property that has
chosen not to show next year's pricing does not have it leak out through this pop-up.

**On community 34 every space has exactly one term row** (671/671), so steps 2–5 do not fire
today. Keep them: they are what stops a second lease window — the next academic year appearing
alongside the current one — from being picked arbitrarily, and that is a matter of when the
property is looked at, not of whether the rule is needed.

**`raw_term` is never read.** The AC says so, and community 34 proves it: all 671 rows are
labelled `LeaseTerm: "4 Months"` while spanning `08/14/2027 → 07/28/2028` — **11.5 months**.
`LeaseTermName` reads `"Annual"`. It is carried on the record for auditing only. Duration,
where needed for tie-breaking, is `end_date - start_date`.

**Academic year** = `"#{start.year}–#{end.year} Academic Year"`, collapsing to
`"#{start.year} Academic Year"` when they match. Derived in the serializer, not stored — it
is a formatting of two columns, and storing it would be a third thing to keep in sync.

**Date range** = `MMM D, YYYY`, formatted **client-side** from ISO dates in the payload. The
payload ships `leaseStartDate: "2027-08-15"`; the React app formats. A server that
pre-formats dates cannot be localised later and forces a redeploy to change a comma.

---

## 6. Serialisation — floor-plan-scoped, precomputed, provider-blind

### 6.1 Why the pop-up reads from `floorplans`, not from `units`

The brief is explicit: *"The pop-up is floor-plan-scoped. Each space letter is 100%
consistent within a floor plan, so a representative unit defines the tab set and per-letter
feature/crown state; only availability is aggregated across all units of the floor plan.
Never render a specific unit number."*

Read that as an instruction about **where the data belongs**. If the pop-up's contents are a
property of the floor plan, computing them by scanning 1,000 units in the browser every time
a visitor opens a modal is the wrong shape — and it is the shape the grouping plan already
rejected once for the units list. So the server emits, per floor plan, a finished tab set.

### 6.2 New payload block

Added to each entry of `floorplans[]` when `community.student_housing_property?` **and** the
floor plan has lettered spaces. That toggle check is the **only** one in the feature, and this
is the only layer it appears in — the serializer does not ask which provider filled the table
(§3), and the import never asks about the toggle at all (§4.1). Absent otherwise — so a payload for any other property is byte-identical to today's, which is the
regression guard §10 tests for.

```jsonc
"spaceConfig": {
  "letters": [
    {
      "letter": "A",
      "availableCount": 17,              // available spaces of this letter, all units of the FP
      "totalCount": 24,
      "isPremium": true,                 // crown on the tab
      "premiumAmenities": ["En-Suite Bathroom", "Corner Unit", "Closet"],
      "rent": 889.0,
      "leaseStartDate": "2027-08-15",    // ISO; the client formats
      "leaseEndDate": "2028-05-15",
      "applyUrl": "https://…",           // space-level, falling back to the floor plan's
      "representativeUnitId": 40213      // for favourites / analytics only — never displayed
    },
    { "letter": "B", "availableCount": 12, "isPremium": false, "premiumAmenities": [], … }
  ]
}
```

- **Every entry is an object, and clients must ignore unknown keys.** That is what makes §8's
  "add a field" a one-key change rather than a client release. The deferred per-space marker
  (`letters[].marker`), a per-space virtual tour, a per-space image — all land as new keys on
  an existing object.
- `availableCount` is the **only** aggregate. Everything else comes from the representative
  space, per the brief's consistency assumption.
- `representativeUnitId` is the stable pick: the floor plan's units carrying that letter,
  ordered by the grouper's `natural_key(marketing_name)` then `id`, first wins. Deliberately
  **not** "first available" — same argument as the base-unit choice in the grouping plan:
  availability flips hourly and would make favourites, deep links and analytics keys unstable
  within a day.
- `applyUrl` resolves through the existing `Unit#get_availability_url`, which already does
  unit-URL → floor-plan-URL fallback and already handles the `separate_link` credential mode.
  **AC7 needs no new serialisation code**, only the right unit to ask — but see §13.3, because
  on community 34 `UnitAvailabilityURL` is *itself* a floor-plan URL (46 distinct values for
  671 spaces). The only space-targeting mechanism is `availability_url_deep_linking`, which
  `get_availability_url` already prefers for psi — and which currently carries a wrong
  `property[id]`.
- **The tab set comes from `unit_space_details`; the counts come from the payload's own
  units.** These are two different sources on purpose, and getting it wrong is the sharpest
  correctness trap in this design.

  `build` narrows units through `map_units → visible_units → without_hidden_names`, and
  `map_units`' final branch — taken whenever `community.turn_availability_on` is **false** —
  is `available_units(...).visible_on_map_for(community)`
  ([unit.rb:255](../app/models/unit.rb#L255)): available-or-soon units only, `sold` excluded,
  and for Entrata with `entrata_available_units_only`, `show_on_map: true` only. **A letter
  whose spaces are all leased is therefore absent from `units_ar` entirely.** Derive the tab
  set from that list and a fully-leased room type silently disappears from the floor plan —
  the pop-up would claim a 4-bed apartment has three room types.

  So:

  | Field | Source | Why |
  |---|---|---|
  | which letters exist, `totalCount` | `unit_space_details` for the floor plan | a room type is a property of the floor plan, not of today's availability; a leased letter still renders, at `0 spaces available` |
  | `premiumAmenities`, `rent`, lease dates | the **display representative** — stable pick over *all* lettered rows | content must not change as leases are signed |
  | `availableCount` | count over `units_ar` | the pop-up must agree with the map and the filters, which read that same list |
  | `representativeUnitId` | the display representative **when it is in `units_ar`**, else the first of that letter that is, else `null` | see below |

  This works because the collector merges **both** `availableUnitsOnly` passes (§4.2), so
  `unit_space_details` holds every space even when the payload holds only the available ones.

- **`availableCount` counts `unit.available`, not raw `VacancyClass`.** The AC names
  `VacancyClass = Unoccupied`, and `unit.available` is exactly that — set from it in
  `save_psi_units` — but additionally honouring `sold`, `manual_override` and the CMS's
  `availability_is_updated`. Reading the raw string back would ignore an override a property
  manager set deliberately, and would disagree with `availableSpaceCount` in the existing
  rollup, which is `spaces.select(&:available)`. One notion of available across the payload.

- **`representativeUnitId` may be `null`, and the client must handle it.** It is an id the
  browser resolves through `getBaseUnit()`; an id outside the payload's `units[]` resolves to
  `null` and the tab silently cannot act. When a letter has no unit in `units_ar` — every
  space leased or hidden — we emit `null` rather than a dangling id, and `applyUrl` falls back
  to `floorplans[].availability_url`. A `0 spaces available` tab is still fully renderable.

- **`spaceConfig` is not narrowed by the visitor's filters.** Tab counts describe the floor
  plan, not the current filter. This matches the rule `unitSiblings.js` already applies to
  grouped properties — *"a door that survived the filters shows all of its bedrooms"* —
  because a switcher that hides letters claims the floor plan has fewer room types than it
  does.
- **Nothing in this block names a provider**, and nothing downstream branches on one. If
  RentCafe fills the table tomorrow, this payload and both clients are unchanged.

### 6.3 What does *not* change

- `units[]` keeps its exact current shape. The rollup fields, `spaces[]`,
  `SPACE_NEVER_KEYS` — untouched. The pop-up needs a floor plan id, and every unit already
  carries one.
- `filters_json` and the floor-plan `unit_count` keep reading the **ungrouped** unit list,
  for the reasons the grouping plan gives.
- A small per-space `space: {...}` block is added to `space_json` **only** for favourites and
  analytics continuity — a favourited bedroom must be able to describe itself in the
  favourites rail without the floor plan in hand. Letter, isPremium, rent, dates.

### 6.4 Data quality is reported, not assumed

`spaceConfig` rests on two assumptions the *property* makes and the *feed* does not
guarantee: that letters are consistent within a floor plan, and that the pricing feed joins
cleanly onto the catalog feed. Both are counted at build time, not asserted:

- letters within one floor plan whose premium sets disagree → log + count
- rows with no matching pricing record (no dates/rent) → count
- pricing records that joined to no unit → count

Surfaced by the audit task (§9) rather than raised. A property with dirty data should render
a slightly reduced pop-up, not a 500.

---

## 7. How this fits the unit-space layer we already shipped

`isGroupedProperty()`, `getUnitSpaces()` and `getBaseUnit()` are live and load-bearing.
**All three stay, with unchanged contracts.** This section says why, and — more importantly
— draws the line between what they own and what `spaceConfig` owns, because that line is the
whole answer to "is this synchronized".

### 7.1 Three joins, three owners

The design rests on three separate joins that are easy to conflate:

| Question | Key | Owner | Produces |
|---|---|---|---|
| Which `Unit` rows are the same apartment (door)? | **plot anchor** — `x_plot`/`y_plot` on an image map, `pointer_data` on an SVG map; the 3D provider anchors the list we hand it | `SdkUnitSpaceGrouper` | `units[].spaces[]`, markers, rollups, units list |
| Which `Unit` row is this feed row? | **provider space id** (Entrata `UnitSpaceID`) | `UnitSpaceDetails::Collector` | `unit_space_details` |
| Which letter is this space, and what tabs does a floor plan show? | **`space_letter` + `floorplan_id`** | `SdkPayloadBuilderService` | `floorplans[].spaceConfig` |

The third join **deliberately does not go through the plot anchor.** The plot anchor is an
*inference* — "these rows are drawn on the same pixel, so they are probably the same
apartment" — and it is the right inference for markers, because a marker genuinely is a
pixel. But the tab set is a statement about the product, and the PMS states it directly:
this space is letter A of this floor plan. Deriving tabs from pixels when the feed names
them would put a rendering artefact in charge of a leasing fact.

That is also why the new pop-up is robust where the grouping is weakest. A student apartment
whose bedrooms were plotted slightly apart, or whose `pointer_data` is missing on one bed,
groups badly — but its `spaceConfig` is unaffected, because letters and floor plan ids do not
care where anything was plotted.

**Where they must agree, and what happens when they don't.** The letters on a door's
`spaces[]` (plot-derived) should be the same set as its floor plan's `spaceConfig.letters`
(feed-derived). When they disagree, one of three things is true: a bedroom is unplotted, two
apartments are plotted on one pixel, or the feed's letters are inconsistent within the floor
plan. **The feed wins for display** — the tab set is always `spaceConfig.letters` — and the
disagreement is counted by the audit task (§6.4, §10). Display never blocks on it; a mismatch
is a data-quality signal, not a runtime error.

Amenity markers use the same anchor scheme as units (`x_plot`/`y_plot`, `pointer_data`) but
are untouched by any of this: `unit_space_details` is units-only, and `amenities_json` is not
read or written here.

### 7.2 The three shipped methods — verdicts

| Method | Answers | Callers today | After this change |
|---|---|---|---|
| `getBaseUnit(id)` | *Which drawn unit does this id belong to?* | `getUnitSpaces`; Beans `onSelect`/`onHover` ([:1896](../public/sdk/pyn-map-sdk-v1.js#L1896), [:1905](../public/sdk/pyn-map-sdk-v1.js#L1905)); deep links; favourites; `highlightUnits` | **unchanged + one new caller** — `SpaceModal` resolves `representativeUnitId` through it to highlight the map and to attribute analytics |
| `isGroupedProperty()` | *Does `units[]` carry nested `spaces[]`?* | `_favouritableUnits` ([:3840](../public/sdk/pyn-map-sdk-v1.js#L3840)); `unitSiblings.js`; `UnitPanel` colour bar | **unchanged** — still the parsing gate; the new pop-up does not consult it (§7.3) |
| `getUnitSpaces(id)` | *Which bedrooms are behind this door?* | `_spacesOrSelf` → `getUnits({includeSpaces:true})`; `unitSiblings.js` grouped branch → `UnitModal`/`UnitDetailMbl` switcher | **unchanged + one new caller** — resolves which real `Unit` a letter tab acts on (§7.4) |

So: nothing is retired, nothing changes shape, and each gains at most one caller. The reason
they survive intact is that `spaceConfig` answers a question none of them asked. They are
**unit-level** APIs (this door, these bedrooms, this id); `getFloorplanSpaceConfig` is a
**floor-plan-level** API. Layers, not alternatives.

`getUnitSpaces`'s grouped branch in `unitSiblings.js` is worth calling out, because routing
student properties to `SpaceModal` could look like it orphans that code. It does not — it
remains the switcher for **grouped properties with no `spaceConfig`**: a property whose feed
yielded no letters, or whose pricing feed is missing (§4.4). That is a real configuration, it
degrades to today's behaviour, and it needs that branch alive.

### 7.3 `hasSpaceConfig()` and `isGroupedProperty()` are different questions

They will both be true on every property this ships to, which is exactly why the difference
has to be written down before someone collapses them:

- `isGroupedProperty()` — **how do I parse `units[]`?** Do entries carry `spaces[]`, do the
  rollup fields exist, is `unitId` a door or a bedroom. A payload-shape question.
- `hasSpaceConfig()` — **is there a floor-plan tab set to render?** A content question,
  answered by whether the import found letters.

They diverge whenever the import comes up empty on a grouped property: `isGroupedProperty()`
stays `true` (the payload is still rolled up), `hasSpaceConfig()` is `false`, and the modal
router falls back to `UnitModal`. Collapsing them into one predicate turns that graceful
degradation into a blank pop-up.

The rule, stated once: **routing and rendering branch on `hasSpaceConfig()`; parsing branches
on `isGroupedProperty()`.** Neither ever branches on a vertical.

### 7.4 Which `Unit` a letter tab acts on

The pop-up shows letters; favourites, Apply Now and analytics need a real `Unit` row. The
resolution order:

```js
// 1. the clicked door's own bedroom of that letter, when the pop-up came from a door
door && PynMapSDK.getUnitSpaces(door.unitId).find(s => s.space?.letter === letter)
// 2. otherwise the floor plan's representative
|| PynMapSDK.getBaseUnit(letter.representativeUnitId)
```

Step 1 is why `getUnitSpaces` stays in the new flow, and why §6.3 puts `space.letter` on the
nested space objects. A visitor who clicked apartment 115 and hits Apply Now on tab A gets
115-A's application URL rather than some other apartment's — the deep link is per-space in
Entrata, so this is not cosmetic.

Step 2 covers the entry points with no door: a floor-plan card in the right rail, a favourite,
a deep link. The representative is stable by construction (§6.2), so these are reproducible.

The brief's *"the property assigns the actual apartment randomly at signing"* means step 2 is
**acceptable**, not that step 1 is pointless: when we know which door the visitor was looking
at, using it costs one lookup and removes a class of "why did it apply for a different
apartment" support tickets.

### 7.5 The header heart is the floor plan's

In both mockups the favourite sits in the header next to the floor-plan name, not on a tab.
So `SpaceModal`'s heart toggles the **floor-plan** favourite, which already exists end to end:
`floorplans[].isFavorite`, `merge_favorites(built[:floorplans], :floorplanId, …)`,
`favorite_floorplans`, and the SDK's `"floorplan"` favourite type. **No new favourites work.**

Consequence worth stating rather than discovering: on a student property the new UI creates no
*per-space* favourites. Existing ones still resolve and still render — `favorited_units` +
`space_as_unit` are untouched — but nothing new adds to them. That is a product decision
inherited from the mockup, and it is the simpler one; flag it if the intent was per-space
hearts on the tabs.

---

## 8. Client work

### 8.1 Retire the prototypes first — this is the synchronisation risk

The React app already carries a **second, mocked** student-housing implementation, and adding
`SpaceModal` beside it would make three parallel paths. Clearing it is part of this ticket,
not a follow-up.

| What | Where | Disposition |
|---|---|---|
| `?student-housing=true` URL param | [App.jsx:1438](../../pynwheel-maps/src/App.jsx#L1438) → `isStudentHousing` prop | **Retire as a parallel signal.** It is a second source of truth for the same question the server now answers. If it is needed for demos, redefine it as a *forcing override* of `hasSpaceConfig()`, never as its own branch. |
| `FloorViewTableModal` | `UnitPanel:444`, `UnitsTab:526/616`, `FloorPlansTab:267/364/372` | **Superseded by `SpaceModal`.** Hardcoded `A <PremiumBadge />`, `isFavorite` is a local `useState(false)`. |
| `FloorListTable` | inside the above | **Delete with it** — rows are literal mock data (`$2300/mo`, `July 1, 2025`). |
| Commented-out Premium Features block | [UnitModal.jsx:758-768](../../pynwheel-maps/src/components/modals/UnitModal/UnitModal.jsx#L758) | **Delete.** Mock content ("Private Balcony"); `UnitModal` is the non-student path now. |
| `Floor : {unitFloor}` | [UnitModal.jsx:792](../../pynwheel-maps/src/components/modals/UnitModal/UnitModal.jsx#L792) | Removed **in `SpaceModal` only** — the AC removes it from the v2 pop-up, and `UnitModal` still serves conventional properties that want it. |
| `unit.premium` reads | `FloorDetailMbl:352`, `UnitDetailMbl:485` | Currently always `undefined`. Repoint at `space.isPremium`, or delete with the mock path. |

The two `PremiumBadge` call sites that stay real are `SpaceModal`'s crown and chips.

`FloorViewTableModal` is doing one thing worth keeping: it is the **mobile** student view. So
retiring it means `SpaceModal` must be responsive (§8.4), not desktop-only.

### 8.2 SDK — `public/sdk/pyn-map-sdk-v1.js`

Additive. Three methods, no change to any existing one:

```js
getFloorplanSpaceConfig(floorplanId)   // the letters array, or null
getSpaceLetters(floorplanId)           // ["A","B","C","D"]
hasSpaceConfig()                       // any floor plan carries one
```

Backed by a `spaceConfigByFloorplanId` index built alongside `_indexUnits`, over
`data.floorplans` — at load, not per call, since the modal re-reads it on every tab click.
Named for the *shape*, never for the vertical or the PMS, exactly as `isGroupedProperty()`
was.

### 8.3 Routing — one rule, desktop and mobile

```
hasSpaceConfig() && getFloorplanSpaceConfig(fpId)  ->  <SpaceModal floorplanId=… door=… />
otherwise                                          ->  <UnitModal /> | <UnitDetailMbl />   (unchanged)
```

The decision lives in **one** `resolveDetailModal(target)` helper.

Half of the brief's *"either clicks from the right rail or from the map itself, every time the
same pop-up should appear"* is already true: a map click, a 3D selection and a rail card all
funnel through `App.handleUnitClick` into a single `selectedUnit`
([App.jsx:1579](../../pynwheel-maps/src/App.jsx#L1579)). The other half is not — **which**
modal to render off that state is decided independently in fifteen places:

- `<UnitModal>` × 7 — `UnitPanel:437`, `UnitsTab:608,634`, `FloorPlansTab:391`,
  `FavsTab:369,396`, `FloorPlanModal:760`
- `<FloorViewTableModal>` × 6 — `UnitPanel:444`, `UnitsTab:526,616`, `FloorPlansTab:267,364,372`
- `<UnitDetailMbl>` / `<FloorDetailMbl>` — the mobile pairs

Fifteen sites each re-deciding on some mix of `isMobileView`, `isStudentHousing` and
`imageOnly` is why a third component cannot simply be added alongside. Routing every one of
them through the helper is what makes the guarantee structural, and it is the only thing that
keeps §8.1's retirement retired.

`target` may be a unit (map/3D/units card/favourite) or a floor plan (floor-plan card); the
helper resolves both to `{ floorplanId, door }`, where `door` is `getBaseUnit(...)` or `null`.
`door` is what §7.4 step 1 needs.

### 8.4 `SpaceModal`

- **left**: floor-plan image + Fullscreen toggle. Lift the existing zoom/pan/fullscreen
  behaviour out of `UnitModal` into a shared `FloorPlanViewer` rather than copying it —
  `usePinchZoom` plus the zoom state machine is ~150 lines that must not fork.
- **right**: `Details` header · stats row (already implemented) · `{n} spaces available` ·
  Premium Features (crown + bare-label chips, **section hidden entirely when empty**) · price
  panel (`$ {rent} / month`, academic-year label, formatted date range) · `Apply Now` ·
  `Virtual Tour`.
- **bottom**: `Unit Spaces` tabs, one per letter, crown on premium letters.
- **header**: floor-plan name + floor-plan favourite (§7.5) + close.
- **No `Floor : {n}`.** **No unit number, anywhere.**
- **Responsive**, replacing `FloorViewTableModal`'s mobile role (§8.1).

Selecting a tab swaps `letters[i]` and re-renders the right panel. No fetch, no recompute, no
scan across units — the payload already holds each tab's finished contents.

Render each section on the presence of its data (`premiumAmenities?.length`, `rent != null`),
never on a property type. A partially-filled provider (§4.4) then degrades into a smaller
pop-up for free, and the §7.3 fallback to `UnitModal` stays a genuine last resort rather than
the thing that catches missing fields.

The pin renders from the floor plan's existing marker data only. Per the AC, individual unit
spaces are **not** drawn as separate markers — deferred, with `letters[].marker` reserved
(§6.2).

### 8.5 Not modified

`UnitModal`, `UnitDetailMbl` and `unitSiblings.js` keep their current behaviour beyond the
`FloorPlanViewer` extraction and the mock deletions in §8.1. Conventional properties must be
untouched, and the cheapest way to guarantee that is to not edit the components they use.

---

## 9. Extending it

Three checklists. If any of these turns out to be longer in practice than it is here, the
seam is in the wrong place and should be moved.

### 9.1 Adding a provider

1. Write `app/services/unit_space_details/adapters/<provider>.rb` — `extract(payload, feed:)`
   returning `SpaceRecord`s. This is the only new file.
2. Add one line to `Adapters::REGISTRY`.
3. Add `collector.absorb(...)` at the two points in that provider's sync service where the
   feeds are already parsed, and `flush!` at the end.
4. If its lease terms need a different choice rule, subclass `LeaseTermPolicy` and name it in
   the adapter. Usually not needed.
5. Extend the audit task's provider list.

Nothing in `Collector`, `PremiumAmenityPolicy`, the migration, `SdkPayloadBuilderService`, the
SDK or the React app changes. RentCafe V2 is the likely first candidate, and
`BaseService#yardi_rent_cafe_property_rent_matrix` already returns its rents and dates (§3.5).

### 9.2 Adding a field to the pop-up

1. If the provider already sends it: adapter → `SpaceRecord` (or `metadata`) → column if the
   client will render it (§2's rule).
2. Serializer: one key on the `letters[]` entry.
3. React: render it on presence.

No migration when it lands in `metadata`; no client release when it lands as a key an older
client ignores.

### 9.3 Turning it on for a non-student property

Nothing in §5–§8 is student-specific: letters, the baseline and the term rule describe
*spaces*, not *students*. Widening it means replacing `student_housing_property?` in the
serializer's gate. The client already branches on `hasSpaceConfig()` — the shape — and never
on the vertical, which is the same discipline `unitGrouping.mode` established and the reason
§8.1 retires the `?student-housing=true` param rather than building on it.

---

## 10. Rollout, verification, rollback

**Order.** §4.5 deep-link fix (own commit, verified on two properties) → migration → adapter +
collector (all Entrata properties, nothing rendered) → run a sync → **audit the data on the real
property** → serializer → SDK → React (including the §8.1 retirement) → flip the toggle.

**Launch checklist, separate from the code** (§13.3): set `apply_now` to `"true"` on community
34, and add `virtual_tour_url`s. Neither needs a deploy; both are invisible until done.

The audit step is load-bearing, and it exists because §5.2's baseline rule is a claim about
data we have not counted yet.

```
rake unit_space_details:audit[COMMUNITY_ID]
```

prints, without writing anything:

- spaces seen, spaces with amenities, spaces joined to a pricing record
- the **full frequency table**: every description with its `count / total` and its baseline
  verdict — this is where you confirm the `*…Select Units` items sit at 100%
- per floor plan: the letters, their premium sets, and any disagreement between units
- **plot-grouping vs feed-letters reconciliation** (§7.1): doors whose `spaces[]` letters do
  not match their floor plan's `spaceConfig.letters`
- the chosen term per representative space, with **every** candidate row listed, so §5.3's
  rule can be eyeballed against a lease a human knows the answer to
- unjoined rows on both sides

Named for the table, not for Entrata: a second provider reuses it.

**Rollback** is the CMS toggle. No deploy, no migration, no data loss — the table keeps
filling, nothing reads it. The one caveat, because §8.1 deletes code: the prototype path
(`FloorViewTableModal`, `?student-housing=true`) is gone after this ships, so rolling back
lands on `UnitModal`, not on the mock. That is the correct destination — the mock rendered
hardcoded prices — but it means the retirement should land in the **same** release as
`SpaceModal`, never ahead of it.

**Blast radius, stated as invariants to hold ourselves to:**

| Invariant | Enforced by |
|---|---|
| No additional API call on the default path | both feeds already pulled; §4.4 is the single gated exception |
| No non-Entrata provider code changes | side table; `Unit.column_names` untouched; `Adapters.for` returns nil |
| `units` row width unchanged | no new columns |
| Payload byte-identical when the toggle is off | `spaceConfig` emitted under the toggle only; §11 test |
| No provider name below the adapter | grep for `"psi"` in `unit_space_details/` outside `adapters/` must be empty |
| **No toggle or property-type check in the import path** | grep for `student_housing_property`, `enable_unit_type_pricing` or `entrata_show_unit_spaces` in `unit_space_details/` must be empty; §11 test |
| **Flipping the toggle needs no sync** | import is unconditional, so the data is already there; §11 test |
| No empty rows | `flush!` writes only records carrying amenities, a letter, or lease terms; §11 test |
| Exactly one student-housing signal in the client | §8.1; grep for `student-housing` in `pynwheel-maps/src` must be empty |
| `representativeUnitId` always resolves | built from the payload's own filtered unit list (§6.2); §11 test |
| A dirty feed degrades the pop-up, never 500s | §6.4 counts instead of raising |
| Import failure cannot fail the sync | `flush!` wrapped; logs and returns |

That last one deserves a line: `collector.flush!` runs **after** `ProvidersDataUpdationService`
has committed the units, and its own failure is caught and logged rather than re-raised. Unit
and floor-plan data reaching the map on time matters more than the pop-up's chips being fresh,
and an exception thrown from a new code path at the end of `perform` would today take the
whole daily sync down with it.

---

## 11. Tests

**`test/services/unit_space_details/collector_test.rb`** — built on `SpaceRecord`s, so it is
provider-free and stays valid when a second adapter lands:
- baseline: an amenity on 100% of spaces is excluded; on 3 of 4 it survives
- normalisation: `"Closet"`, `"closet "`, `" Closet"` count as one description
- amenity-less spaces are excluded from the denominator
- one amenity-carrying space → no premiums (not "all premium")
- term choice: future beats current; current beats past; `turn_availability_on: false`
  suppresses the future one; `raw_term` is never consulted (a row labelled `"4 Months"`
  spanning 11.5 months is chosen on its dates)
- absorbing the same feed twice produces one row per space and one baseline over the full set
- a record joining to no unit is counted, not raised
- a record with amenities but no lease terms writes a row with null dates
- **a record carrying none of amenities / letter / lease terms writes no row at all**
- **the import is identical with `student_housing_property` true and false** — same rows, same
  values; the collector never reads the toggle
- the import is identical with `enable_unit_type_pricing` true and false, apart from the lease
  terms the feed itself did or did not carry (§4.4)

**`test/services/unit_space_details/adapters/entrata_test.rb`** — the only Entrata-shaped
tests, on fixture hashes, no network:
- `Amenity` read from both possible paths and deduplicated
- letter: `OrganizationName` third segment wins; `MarketingName` suffix is the fallback;
  `"103"` yields `nil`
- both feeds emit records that merge on `provider_space_id`

**`test/services/sdk_payload_builder_service_test.rb`** — extend the existing regression guard:
- toggle **off** → payload byte-identical to today, `spaceConfig` absent everywhere, **even
  when `unit_space_details` is fully populated** — the data being present must not leak
- toggle flipped **on with no intervening sync** → `spaceConfig` appears immediately from the
  rows already stored
- toggle **on** → `letters` ordered A→D; `availableCount` aggregates across all units of the
  floor plan for that letter; a letter with no premium amenities reports `isPremium: false`
  and an empty array
- `representativeUnitId` is stable when availability flips, **and is always present in the
  same payload's `units[]`** — including when its unit is hidden or unplotted (§6.2)
- `spaceConfig` is unaffected by anything `filters_json` narrows
- `applyUrl` falls back from the space URL to the floor plan URL
- a letter with no lease terms omits the price keys rather than emitting nulls
- a grouped property whose import found no letters emits **no** `spaceConfig` while
  `unitGrouping.mode` stays `"spaces"` (§7.3's divergence case)
- **`turn_availability_on: false` + a fully-leased letter**: the letter still appears, with
  `availableCount: 0`, `totalCount` > 0, its chips and rent intact, and
  `representativeUnitId: null` — the §6.2 trap, asserted directly
- a unit excluded by `show_on_map` / `visible` / a hidden name is never chosen as
  `representativeUnitId`

**`test/sdk/space_config_test.js`**:
- `getFloorplanSpaceConfig` returns null for a property without one and for an unknown id
- the index is built once
- `getUnitSpaces`, `getBaseUnit` and `isGroupedProperty` behave **identically** before and
  after `spaceConfig` is present in the payload — the regression guard for §7.2

**Manual, on the real property, before the toggle:** every tab's chips match what the property
manager says that room type has; the date range matches a real lease; Apply Now lands on the
right space; the same pop-up opens from a map marker, a 3D selection, a units card and a
floor-plan card.

---

## 12. Explicitly deferred

- **Per-space markers on the floor-plan image** — the AC defers them; §8.4 renders the floor
  plan's existing pin only, and §6.2 reserves `letters[].marker`.
- **Per-space favourites from the new UI** — the mockup's heart is the floor plan's (§7.5).
  Existing space favourites keep working; no new ones are created.
- **Non-Entrata adapters.** The seam, the struct, the policies and the table are
  provider-neutral and RentCafe's data is already fetched (§3.5) — but no second adapter is
  written here, and no abstract base class is extracted until there are two implementations to
  extract it from.
- **Deduplicating `PsiService` / `PsiStaticService` / `PsiSwapService`.** Three near-copies;
  the three-line addition lands three times. Worth fixing, not worth coupling to this.
- **Enriching the Apply Now deep link from the stored terms.** The malformed `property[id]` is
  fixed here (§4.5); what stays deferred is *improving* the link — `term_month/12` is a hardcoded
  fallback and `lease_start_date` comes from `available_date` (08/01/2027) rather than the term's
  real `StartDate` (08/14/2027). Both are now available in `lease_terms`. That changes what the
  link means for every existing Entrata property, so it wants its own ticket and its own
  rollback — unlike the well-formedness fix, which does not.
- **UC 08 / PYN-1638**, unit spaces as real child rows. This table is designed to be its
  ancestor: one row per space, keyed on the provider's space id, provider-stamped. When it
  lands, `SdkUnitSpaceGrouper`'s plot-anchor inference (§7.1) can be retired in favour of a
  real association, and the first of the three joins disappears.

---

## 13. Verified against community 34 (Troubadour)

Both feeds were called live on **2026-08-25** and the whole pipeline dry-run against the
responses. Config: `data_provider psi`, `student_housing_property true`,
`turn_availability_on true`, `enable_unit_type_pricing false`, SVG mode, floorplate map,
**671 units / 46 floor plans**, Entrata property `100152889`, subdomain `cardinal`.

### 13.1 The feeds

| Check | Result |
|---|---|
| Feed A `getMitsPropertyUnits` | `code 200`, 2.19 MB, **671 `ILS_Unit`** |
| `ILS_Unit` keys | `Identification, Units, Availability, Amenity` — **`Amenity` is top-level** |
| `Amenity` shape | array of 22–24 × `{"@attributes":{"AmenityType":"Other"},"Description":"…"}` |
| `OrganizationName` | `"100152889~..~4455543~..~a"` — 3rd segment, **lowercase** |
| Feed B `getUnitsAvailabilityAndPricing` | `code 200`, 570 KB, **276 `PropertyUnit` → 671 `UnitSpace`** |
| `UnitSpace` container | **Hash on all 276** — never an Array |
| **Join A↔B on `UnitSpaceID`** | **671 / 671, zero unmatched either way** |
| Join feed → `units.provider_unit_id` | **671 / 671** |
| `map_units → visible_units → without_hidden_names` | 671 — nothing filtered on this property |

276 `PropertyUnit`s is exactly the door count the grouping plan measured (671 → 276), so the
feed's own unit/space split and `SdkUnitSpaceGrouper`'s plot-anchor inference agree here (§7.1).

### 13.2 The three derivations, on real data

**Premium baseline (§5.2) — the rule works, unmodified.** 671/671 spaces carry amenities;
25 distinct descriptions; **22 sit at 671/671 and are excluded**; 3 survive:

| Chip | Spaces | Share |
|---|---|---|
| En-Suite Bathroom | 187 | 27.9 % |
| Corner Unit | 106 | 15.8 % |
| Closet | 21 | 3.1 % |

**Those are exactly the three chips in the mockup.** Every `*…Select Units` item the AC named
— `*Patios/Balconies in Select Units`, `Courtyard Views*`, `Private Bathrooms*`,
`Walk-in Closets*`, `Video Doorbells*`, `Townhome Units*` and the rest — lands in the 100 %
baseline and is excluded, with **no hardcoded list**. The §10 audit assumption is confirmed.

**Letters (§5.1).** A=276, B=159, C=113, D=99, E=24. **Zero nils, zero mismatches** between
`OrganizationName`, Feed B's `UnitNumber` and the `MarketingName` suffix.

**Floor-plan consistency (§6.1) — the assumption the whole design rests on.** Across **127
floor-plan × letter groups, zero inconsistent premium sets**. A representative space genuinely
speaks for its letter.

**Lease terms (§5.3).** 671/671 spaces have exactly one term row, all
`08/14/2027 → 07/28/2028`, `SpaceOption "Private"`, rents `829–1,949`. Zero missing dates.

### 13.3 Pre-existing issues this feature surfaces — all now decided

None are caused by this feature. Dispositions were confirmed on 2026-08-25 and are recorded
in the header table.

1. **Apply Now is switched off on this property.** `credentials.apply_now == "false"` →
   `apply_now_config` returns `{enabled: false, mode: "none"}` → the FE's
   `shouldDisplayApplyNow` hides the button. Configuration, not code.
   → **Decided: build it.** The button renders on data presence, so the code is the same either
   way. Setting `apply_now` to `"true"` for community 34 is a **launch-checklist item** — until
   it is done, the AC's primary action will not appear, however correct the pop-up is.

2. **Virtual Tour has no data.** `virtual_tour_url` is blank on **all 671 units and all 46
   floor plans**. Content, not code.
   → **Decided: build it.** Same launch-checklist treatment: the section renders on presence
   (§8.4), so adding tour URLs later needs no deploy.

3. **The Apply Now deep link is malformed.** `set_availability_url`
   ([psi_service.rb](../app/services/psi_service.rb)) assigns both `property_id` and `unit_id`
   from `u.dig('Identification','IDValue')`, so the built URL carries
   `property[id]/4814372` — the **UnitSpaceID**, where Entrata expects the property id
   `100152889`:

   ```
   …/property[id]/4814372/property_floorplan[id]/1124164/unit_space[id]/4814372/…
                  ^^^^^^^ should be 100152889
   ```

   `unit_space[id]` is correct, so the link does target the right space.
   → **Decided: fixed in this ticket**, ahead of the serializer work. See §4.5.

   Related, and fixed for free by this feature's data: `term_month/12` is a hardcoded fallback
   because `lease_pricing` is empty (see 4), and `lease_start_date=08/01/2027` comes from
   `available_date` rather than the term's real `StartDate` of `08/14/2027`.

4. **`lease_pricing` is empty on all 671 units, and 141 have `market_rent = 0`** — while Feed B
   carries a rent for every one of them. `update_unit_pricing_and_availability` only builds the
   `lease_pricing` string `if TermRent.count > 1`, and this property always has exactly one row,
   so the single term is discarded. This is the plan's premise demonstrated: **the new
   `lease_terms` / `space_rent` columns will show a correct price on 141 spaces that currently
   render as $0.** No change to the existing `lease_pricing` behaviour is proposed here.

5. **Every space currently reads `VacancyClass: "Unoccupied"` / `UnitOccupancyStatus: "vacant"`**
   (671/671), so `availableCount == totalCount` on this property today — the property is
   pre-leasing the 2027-28 year. The §6.2 split between the two sources is therefore not
   *observable* here, but it is not dead: it fires as leases are signed, and on any property
   with `turn_availability_on` false. Do not simplify it away because this property cannot
   currently tell the difference.

### 13.4 Dry-run output — floor plan 1124174, "4BR/4BA - D1 Balcony"

Produced by running §5's derivations over the two live responses:

```
  A  avail=18/18  premium=true   rent=909.00  Aug 14, 2027 - Jul 28, 2028  AY=2027-2028  ["En-Suite Bathroom"]
  B  avail=18/18  premium=false  rent=909.00  Aug 14, 2027 - Jul 28, 2028  AY=2027-2028  []
  C  avail=18/18  premium=false  rent=909.00  Aug 14, 2027 - Jul 28, 2028  AY=2027-2028  []
  D  avail=18/18  premium=true   rent=909.00  Aug 14, 2027 - Jul 28, 2028  AY=2027-2028  ["En-Suite Bathroom"]
```

Four tabs for a 4-bedroom plan, crowns on A and D, one chip each, `$909 / month`,
`2027–2028 Academic Year`, `Aug 14, 2027 – Jul 28, 2028` — the mockup's layout, from the feed,
with no hand-tuning. The AC's own example date range ("Aug 14, 2027 – Jul 28, 2028") is this
property's actual data.

Raw responses are in the session scratchpad as `feedA.json` / `feedB.json` if you want to
re-run anything against them without hitting the API.
