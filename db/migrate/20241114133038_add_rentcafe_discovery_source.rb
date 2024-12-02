class AddRentcafeDiscoverySource < ActiveRecord::Migration[5.0]
  def up
    add_column :schedual_tours, :rentcafe_discover_source, :string, default: "", if_exists: false
  end

  def down
    remove_column :schedual_tours, :rentcafe_discover_source, if_exists: true
  end
end
