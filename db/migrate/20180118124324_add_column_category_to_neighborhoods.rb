class AddColumnCategoryToNeighborhoods < ActiveRecord::Migration[5.0]
  def change
    add_column :neighborhoods, :category, :string, :default => "Dining,Shopping,Entertainment,Schools,Banks,Parks,Errands"
  end
end
