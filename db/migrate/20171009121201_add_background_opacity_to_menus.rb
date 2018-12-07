class AddBackgroundOpacityToMenus < ActiveRecord::Migration[5.0]
  def change
    add_column :menus, :background_opacity, :float
  end
end
