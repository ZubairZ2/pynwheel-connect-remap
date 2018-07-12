class CreateEbrochureMenuButtons < ActiveRecord::Migration[5.0]
  def change
    create_table :ebrochure_menu_buttons do |t|
      t.string :name
      t.text :url
      t.integer :favorite_setting_id
      t.timestamps
    end
  end
end
