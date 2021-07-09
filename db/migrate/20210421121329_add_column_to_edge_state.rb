class AddColumnToEdgeState < ActiveRecord::Migration[5.0]
  def change
    add_column :edge_states, :is_authorized_with_pynwheel, :boolean, :default => false
  end
end
