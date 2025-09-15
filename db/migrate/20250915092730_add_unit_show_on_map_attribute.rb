class AddUnitShowOnMapAttribute < ActiveRecord::Migration[7.2]
  def change
    add_column :units, :show_on_map, :boolean, default: false
  end
end
