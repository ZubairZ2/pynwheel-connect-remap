# PYN-1610: which map views ("2d", "3d", "both") a property's map offers.
#
# NULL means "not chosen": Community#resolved_map_views then derives it from
# what is actually configured -- both when the property has a 2D map and 3D is
# on, otherwise whichever one exists. So every existing property keeps today's
# behavior without a per-row backfill, and the default follows the property if
# a map is added or removed later.
#
# The one exception is Beans (Apartment List) properties. Their map has always
# been forced to 3D-only by a hardcoded `data_provider === "beans"` check in
# webpages.js, which this setting replaces. Pinning them to "3d" keeps them
# exactly as they were once that check is gone.
class AddAvailableMapViewsToCommunities < ActiveRecord::Migration[7.2]
  def up
    add_column :communities, :available_map_views, :string

    execute <<~SQL
      UPDATE communities
         SET available_map_views = '3d'
       WHERE data_provider = 'beans'
         AND enable_three_d_maps = TRUE
    SQL
  end

  def down
    remove_column :communities, :available_map_views
  end
end
