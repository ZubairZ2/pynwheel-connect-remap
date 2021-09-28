class AddColumnToHallways < ActiveRecord::Migration[5.0]
  def change
    add_column :hallways, :selected, :boolean
  end
end
