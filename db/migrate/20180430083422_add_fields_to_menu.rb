class AddFieldsToMenu < ActiveRecord::Migration[5.0]
  def change
    add_column :menus, :navigation_text_color, :string
    add_column :menus, :navigation_background_color, :string
  end
end
