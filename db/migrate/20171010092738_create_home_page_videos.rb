class CreateHomePageVideos < ActiveRecord::Migration[5.0]
  def change
    create_table :home_page_videos do |t|
      t.string :video
      t.string :name
      t.integer :design_id

      t.timestamps
    end
  end
end
