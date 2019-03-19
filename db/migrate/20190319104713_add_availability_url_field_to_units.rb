class AddAvailabilityUrlFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :availability_url, :string
  end
end
