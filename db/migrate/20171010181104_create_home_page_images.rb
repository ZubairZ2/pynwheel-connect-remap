class CreateHomePageImages < ActiveRecord::Migration[5.0]
  def change
    create_table :home_page_images do |t|
      t.string :image
      t.string :name
      t.integer :design_id
      t.float :crop_x
      t.float :crop_y
      t.float :crop_w
      t.float :crop_h
      t.integer :sort
      
      t.timestamps
    end
  end
end