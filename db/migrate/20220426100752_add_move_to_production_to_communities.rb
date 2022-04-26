class AddMoveToProductionToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :move_to_production, :boolean, :default => true
  end
end
