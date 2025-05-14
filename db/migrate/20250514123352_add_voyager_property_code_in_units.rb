class AddVoyagerPropertyCodeInUnits < ActiveRecord::Migration[7.2]
  def change
    add_column :units, :voyager_property_code, :string
  end
end
