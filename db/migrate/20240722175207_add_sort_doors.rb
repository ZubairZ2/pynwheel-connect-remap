class AddSortDoors < ActiveRecord::Migration[5.0]
  def change
    add_column :doors, :sort, :integer, default: 1
  end
end
