class CreateGroupHomepageImages < ActiveRecord::Migration[5.0]
  def change
    create_table :group_homepage_images do |t|
      t.string :image

      t.timestamps
    end
  end
end
