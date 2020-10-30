class CreateTutorials < ActiveRecord::Migration[5.0]
  def change
    create_table :tutorials do |t|
      t.references :community, foreign_key: true
      t.string :name
      t.string :description
      t.string :video_type
      t.string :video
      t.string :filename

      t.timestamps
    end
  end
end
