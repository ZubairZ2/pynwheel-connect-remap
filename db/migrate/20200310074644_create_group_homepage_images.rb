class CreateGroupHomepageImages < ActiveRecord::Migration[5.0]
  def change
    create_table :group_homepage_images do |t|
      t.string :image
      t.references :group_design, foreign_key: true

      t.timestamps
    end
  end
end
