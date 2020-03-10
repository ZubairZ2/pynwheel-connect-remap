class CreateGroupDesigns < ActiveRecord::Migration[5.0]
  def change
    create_table :group_designs do |t|
      t.string :logo_position
      t.string :button_shape
      t.string :button_width
      t.string :button_height
      t.string :button_spacing
      t.string :background_image
      t.string :button_color
      t.string :button_opacity
      t.string :button_border_side
      t.string :button_border_color
      t.string :button_border_opacity
      t.string :button_border_thickness
      t.string :button_font_family
      t.string :button_font_size
      t.string :button_font_color
      t.references :community_group, foreign_key: true

      t.timestamps
    end
  end
end
