class AddMapAvailabilityOnToggle < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :turn_availability_on, :boolean, default: false
  end
end
