class CreateFavorites < ActiveRecord::Migration[5.0]
  def change
    create_table :favorites do |t|
      t.integer :community_id
      t.string :session_id
      t.jsonb :unit_ids

      t.timestamps
    end
  end
end
