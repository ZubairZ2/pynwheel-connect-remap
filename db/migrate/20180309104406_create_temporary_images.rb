class CreateTemporaryImages < ActiveRecord::Migration[5.0]
  def change
    create_table :temporary_images do |t|
      t.text :image
      t.integer :position
      t.integer :community_id
      t.string :name

      t.timestamps
    end
  end
end
