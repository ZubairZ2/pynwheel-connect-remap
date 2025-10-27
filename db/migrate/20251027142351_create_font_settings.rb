class CreateFontSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :font_settings do |t|
      t.references :community, null: false, foreign_key: true, index: { unique: true }
      t.string :svg_labels_font_family

      t.timestamps
    end
  end
end
