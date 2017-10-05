class CreateMenus < ActiveRecord::Migration[5.0]
  def change
    create_table :menus do |t|
      t.string :position
      t.string :button_style
      t.string :border_radius
      t.string :border_width
      t.string :border_color
      t.string :button_background_color
      t.string :button_hover_color
      t.boolean :manage_background , default: :false
      t.string :background_color
      t.integer :design_id

      t.timestamps
    end
  end
end
