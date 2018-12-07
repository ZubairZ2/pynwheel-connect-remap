class CreateHomeScreens < ActiveRecord::Migration[5.0]
  def change
    create_table :home_screens do |t|
      t.string :appartments_button
      t.string :galleries_button
      t.string :neighborhood_button
      t.string :favorities_button
      t.string :menu_position
      t.boolean :manage_background
      t.string :background_color
      t.integer :design_id

      t.timestamps
    end
  end
end
