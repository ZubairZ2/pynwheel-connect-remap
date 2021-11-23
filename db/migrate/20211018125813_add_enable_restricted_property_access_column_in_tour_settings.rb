class AddEnableRestrictedPropertyAccessColumnInTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :enable_restricted_property_access, :boolean, default: false
  end
end
