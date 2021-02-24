class AddAllowVirtualTourFieldToTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :allow_virtual_tour, :boolean, default: false
    add_column :tour_settings, :allow_self_tour, :boolean, default: true
    add_column :tour_settings, :allow_guided_tour, :boolean, default: true
  end
end
