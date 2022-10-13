class AddBuildingToggle < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_building, :boolean, default: false
  end
end
