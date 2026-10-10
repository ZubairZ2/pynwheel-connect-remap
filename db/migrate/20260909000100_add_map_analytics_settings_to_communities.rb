# Per-property control over what the map exposes to the embedding page's
# Google Tag Manager data layer (PYN-1655).
#
# A property setting rather than a constant in the SDK, because the SDK is one
# file every embedding client loads from our CDN. Hardcoding the exposed events
# there would mean a JS release -- and a cache bust for every client -- each time
# one property wants one more event in its GA4. This way it is a CMS toggle.
#
# Shape:
#
#   {
#     "data_layer": {
#       "enabled":       true,
#       "actions":       ["apply_clicked", "schedule_tour_clicked"],
#       "target_origin": "https://www.renu.com"
#     }
#   }
#
#   enabled       -- master switch. Off means the map emits nothing to the page.
#   actions       -- client-facing action names allowed through, from
#                    Analytics::MapEventContract::ACTIONS. Absent or empty means
#                    the contract's default set, which is the two CTAs Renu asked
#                    for. An unknown name is ignored, never trusted.
#   target_origin -- the exact origin the postMessage is addressed to. Null means
#                    broadcast, which is what every property gets until it asks
#                    otherwise: the payload carries IDs and labels only, no PII,
#                    and the receiving page still verifies our origin in its own
#                    relay snippet. Setting it narrows delivery to one host.
#
# Empty default, not a populated one. A property with `{}` reads through to the
# contract defaults, so enrolling a client is a write and un-enrolling is a
# delete -- there is no third "explicitly configured to the defaults" state to
# reason about.
class AddMapAnalyticsSettingsToCommunities < ActiveRecord::Migration[7.2]
  def up
    return if column_exists?(:communities, :map_analytics_settings)

    add_column :communities, :map_analytics_settings, :jsonb, default: {}

    execute "UPDATE communities SET map_analytics_settings = '{}'::jsonb WHERE map_analytics_settings IS NULL;"

    # NOT VALID so the invariant holds for new rows without taking a full-table
    # validation lock on a large table, matching how communities' other boolean
    # and JSONB settings were added.
    execute <<~SQL
      ALTER TABLE communities
        ADD CONSTRAINT communities_map_analytics_settings_not_null
        CHECK (map_analytics_settings IS NOT NULL)
        NOT VALID;
    SQL

    # Finding the enrolled properties, for the digest and for support questions
    # like "who has this turned on". Partial: the overwhelming majority of rows
    # are `{}` and never need to be in the index.
    execute <<~SQL
      CREATE INDEX IF NOT EXISTS idx_communities_map_analytics_data_layer_enabled
        ON communities ((map_analytics_settings -> 'data_layer' ->> 'enabled'))
        WHERE map_analytics_settings -> 'data_layer' ->> 'enabled' = 'true';
    SQL
  end

  def down
    execute "DROP INDEX IF EXISTS idx_communities_map_analytics_data_layer_enabled;"
    execute "ALTER TABLE communities DROP CONSTRAINT IF EXISTS communities_map_analytics_settings_not_null;"
    remove_column :communities, :map_analytics_settings if column_exists?(:communities, :map_analytics_settings)
  end
end
