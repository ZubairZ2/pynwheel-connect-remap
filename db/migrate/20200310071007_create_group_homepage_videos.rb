class CreateGroupHomepageVideos < ActiveRecord::Migration[5.0]
  def change
    create_table :group_homepage_videos do |t|
      t.string :video
      t.references :group_design, foreign_key: true

      t.timestamps
    end
  end
end
