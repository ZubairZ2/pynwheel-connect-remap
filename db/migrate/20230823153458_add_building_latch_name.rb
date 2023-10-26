class AddBuildingLatchName < ActiveRecord::Migration[5.0]
  def change
    add_column :latches, :latch_property_name, :string, :default => ""
  end
end
