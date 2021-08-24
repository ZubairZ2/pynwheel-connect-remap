class AddColumnsInSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :community_logo, :boolean, default: true
    add_column :communities, :enable_home_legend, :boolean, default: true
    add_column :communities, :enable_amenity_legend, :boolean, default: true
  end
end
