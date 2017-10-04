class CreateDesigns < ActiveRecord::Migration[5.0]
  def change
    create_table :designs do |t|
      t.string :primary_color
      t.string :secondary_color
      t.string :primary_font_family
      t.string :primary_font_size
      t.string :primary_font_weight
      t.string :primary_text_align
      t.string :primary_font_color
      t.string :secondary_font_family
      t.string :secondary_font_size
      t.string :secondary_font_weight
      t.string :secondary_text_align
      t.string :secondary_font_color
      t.string :main_screen_background_color
      t.string :inner_screen_background_color
      t.integer :community_id
      t.timestamps
    end
  end
end
