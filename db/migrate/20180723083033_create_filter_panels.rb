class CreateFilterPanels < ActiveRecord::Migration[5.0]
  def change
    create_table :filter_panels do |t|
      t.string :button_border_color
      t.string :text_font_size
      t.string :button_text_font_size
      t.integer :design_id

      t.timestamps
    end
  end
end
