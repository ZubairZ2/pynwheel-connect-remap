class CreateGables < ActiveRecord::Migration[5.0]
  def change
    create_table :gables do |t|
      t.boolean :hide_tagline
      t.string :appartment_button_color
      t.string :gallery_button_color
      t.string :neighborhood_button_color
      t.string :favorite_button_color
      t.string :filter_panel_color
      t.integer :design_id

      t.timestamps
    end
  end
end
