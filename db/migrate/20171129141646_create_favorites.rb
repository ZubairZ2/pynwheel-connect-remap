class CreateFavorites < ActiveRecord::Migration[5.0]
  def change
    create_table :favorites do |t|
      t.integer :community_id
      t.integer :unit_id

      t.timestamps
    end
  end
end
