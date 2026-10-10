# PYN-1610: which view ("2d" or "3d") a map opens in when it offers both.
#
# NULL means 2D, what a map with both views has always opened in -- except that
# the old map also opened in 3D whenever "Default Satellite View" was on. That
# toggle now only picks satellite vs 3D imagery inside the 3D view, so those
# properties get "3d" here and keep opening exactly where they did.
class AddDefaultMapViewToCommunities < ActiveRecord::Migration[7.2]
  def up
    add_column :communities, :default_map_view, :string

    execute <<~SQL
      UPDATE communities
         SET default_map_view = '3d'
       WHERE default_satellite_view = TRUE
         AND enable_three_d_maps = TRUE
    SQL
  end

  def down
    remove_column :communities, :default_map_view
  end
end
