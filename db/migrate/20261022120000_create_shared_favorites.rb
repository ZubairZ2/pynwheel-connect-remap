# A frozen copy of a visitor's favorites, taken when they share them. The share
# link points at `token`, not at the session, so later favorite changes in the
# session don't change links already sent.
#
# The id columns mirror `favorites` so the same type → column mapping
# (FavoriteIdColumns) reads both.
class CreateSharedFavorites < ActiveRecord::Migration[7.2]
  def change
    create_table :shared_favorites do |t|
      t.string  :token,             null: false
      t.integer :community_id,      null: false
      # The sender's SDK session. Used only to reuse a share whose list hasn't
      # changed; never to look a share up for display.
      t.string  :session_id
      t.jsonb   :unit_ids,          null: false, default: []
      t.jsonb   :amenity_ids,       null: false, default: []
      t.jsonb   :floorplan_ids,     null: false, default: []
      t.jsonb   :gallery_image_ids, null: false, default: []
      t.timestamps
    end

    add_index :shared_favorites, :token, unique: true
    add_index :shared_favorites, [:community_id, :session_id]
  end
end
