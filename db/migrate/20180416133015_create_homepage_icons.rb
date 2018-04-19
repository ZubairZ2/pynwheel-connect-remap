class CreateHomepageIcons < ActiveRecord::Migration[5.0]
  def change
    create_table :homepage_icons do |t|
      t.string :image
      t.string :name
      t.integer :sort
      t.references :design, foreign_key: true
      t.float :crop_x
      t.float :crop_y
      t.float :crop_w
      t.float :crop_h

      t.timestamps
    end
  end
end
