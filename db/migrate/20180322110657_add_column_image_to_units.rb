class AddColumnImageToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :image, :string
  end
end
