class AddShowAmenityNameIntoCommunity < ActiveRecord::Migration[5.0]
  def up
    add_column :communities, :show_amenity_name, :boolean, default: true, if_exists: false
  end

  def down
    remove_column :communities, :show_amenity_name, if_exists: true
  end
end
