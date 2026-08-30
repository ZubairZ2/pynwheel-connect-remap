# Per-leasable-space detail imported from a PMS feed: the space's letter, its
# amenities, and its lease terms.
#
# A side table rather than columns on `units`, for three reasons (see
# docs/student-housing-space-popup-plan.md §2):
#
#   1. `units` is loaded in full on every map payload build. An amenity array is
#      ~600 B per row; on a 1,000-bedroom property that is ~600 KB of extra row
#      width read for every property, including the ones that never use this.
#   2. ProvidersDataUpdationService bulk-writes `Unit.column_names` on every
#      sync, so a column here would be written by every provider importer --
#      Yardi, RealPage, RentCafe, AppFolio, RentManager, XML, Zaremba. This way
#      none of their code paths change at all.
#   3. UC 08 / PYN-1638 makes unit spaces real child rows. A table already keyed
#      on "one row per space, joined on the provider's space id" becomes that
#      table's ancestor.
#
# Nothing below names a provider. `provider_space_id` and `space_option` are
# named for what they mean, not for the Entrata fields that fill them first.
class CreateUnitSpaceDetails < ActiveRecord::Migration[7.2]
  def change
    create_table :unit_space_details do |t|
      t.references :unit, null: false, index: { unique: true },
                          foreign_key: { on_delete: :cascade }
      # Scopes the premium-amenity baseline and the prune. No FK: units.community_id
      # has none either, and adding one here would be the only such constraint.
      t.integer :community_id, null: false
      # The adapter that wrote the row. Stamped per row rather than inferred from
      # the community, because a property can be swapped between providers and
      # rows from both briefly coexist.
      t.string :provider, null: false
      # The PMS's own id for this leasable space -- Entrata's UnitSpaceID. The
      # join key between the two feeds, and the only one we join on.
      t.string :provider_space_id
      # "A" / "B" / ... -- nil when the feed names no letter, which is the normal
      # case for a conventional property with one space per unit.
      t.string :space_letter
      # Occupancy / configuration label, verbatim ("Private", "Shared").
      t.string :space_option

      # Every description the feed gave, normalised for comparison but kept in
      # its original spelling. Retained alongside premium_amenities so the
      # baseline can be recomputed or audited without a fresh feed pull.
      t.jsonb :amenities, null: false, default: []
      # The sub-100%-frequency subset: what actually distinguishes this space
      # from every other on the property. Recomputed on every sync.
      t.jsonb :premium_amenities, null: false, default: []
      # [{rent:, start_date:, end_date:, raw_term:, space_option:}]
      t.jsonb :lease_terms, null: false, default: []
      # Provider-specific extras nothing renders yet, so a new provider needs no
      # migration. The rule: if the client reads it, it earns a column; if only
      # an adapter or an audit reads it, it lives here.
      t.jsonb :metadata, null: false, default: {}

      # The chosen term (LeaseTermPolicy), denormalised. The pop-up shows exactly
      # one term, and resolving it per row on every map load is the per-row work
      # the space rollup exists to avoid.
      t.date :lease_start_date
      t.date :lease_end_date
      t.decimal :space_rent, precision: 10, scale: 2

      t.datetime :synced_at

      t.timestamps
    end

    add_index :unit_space_details, %i[community_id space_letter]
    add_index :unit_space_details, %i[community_id provider_space_id]
    add_index :unit_space_details, %i[community_id provider]
  end
end
