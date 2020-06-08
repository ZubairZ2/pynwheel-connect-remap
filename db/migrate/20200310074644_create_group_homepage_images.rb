class CreateGroupHomepageImages < ActiveRecord::Migration[5.0]
  def change
    create_table :group_homepage_images do |t|
      t.string :image
      t.string :name
      t.boolean :is_small
      t.float :crop_x
      t.float :crop_y
      t.float :crop_w
      t.float :crop_h
      t.references :group_design, foreign_key: true

      t.timestamps
    end
  end
end
