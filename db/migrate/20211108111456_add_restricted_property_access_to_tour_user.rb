class AddRestrictedPropertyAccessToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :restricted_property_access, :boolean, default: false
  end
end
