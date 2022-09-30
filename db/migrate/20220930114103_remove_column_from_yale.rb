class RemoveColumnFromYale < ActiveRecord::Migration[5.0]
  def change
    remove_column :yales, :unit_name
    remove_column :yales, :amenity_name
    remove_column :yales, :stop_name
    remove_reference :yales, :unit
    remove_reference :yales, :amenity
    remove_reference :yales, :edge_state
    add_reference :yales, :community
  end
end
