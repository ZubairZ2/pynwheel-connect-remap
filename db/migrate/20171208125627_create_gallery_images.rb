class CreateGalleryImages < ActiveRecord::Migration[5.0]
  def change
    create_table :gallery_images do |t|
      t.string :image
      t.float :crop_x
      t.float :crop_y
      t.float :crop_w
      t.float :crop_h
      t.integer :sort
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
