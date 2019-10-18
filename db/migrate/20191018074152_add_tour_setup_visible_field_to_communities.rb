class AddTourSetupVisibleFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :tour_setup_visible, :boolean, default: false
  end
end
