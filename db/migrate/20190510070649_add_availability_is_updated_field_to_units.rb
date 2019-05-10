class AddAvailabilityIsUpdatedFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :availability_is_updated, :boolean
  end
end
