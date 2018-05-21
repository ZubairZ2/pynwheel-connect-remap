class CreateFavoriteImages < ActiveRecord::Migration[5.0]
  def change
    create_table :favorite_images do |t|
      t.string :image
      t.references :favorite_setting, foreign_key: true

      t.timestamps
    end
  end
end
