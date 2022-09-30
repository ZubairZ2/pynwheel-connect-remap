class RemoveColumnsFromSchlage < ActiveRecord::Migration[5.0]
  def change
    remove_column :schlages, :unit_name
    remove_column :schlages, :amenity_name
    remove_column :schlages, :stop_name
    remove_reference :schlages, :unit
    remove_reference :schlages, :amenity
    remove_reference :schlages, :edge_state
    add_reference :schlages, :community
  end
end
