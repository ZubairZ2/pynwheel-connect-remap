class AddFieldsToMenus < ActiveRecord::Migration[5.0]
  def change
    add_column :menus, :vertical_menu_position, :string
    add_column :menus, :horizontal_menu_position, :string
  end
end
