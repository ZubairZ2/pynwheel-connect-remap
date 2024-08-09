class AddUnitVisibilityFlag < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :visible, :boolean, default: true
  end
end
