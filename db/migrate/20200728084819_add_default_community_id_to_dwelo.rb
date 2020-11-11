class AddDefaultCommunityIdToDwelo < ActiveRecord::Migration[5.0]
  def change
    add_column :dwelos, :default_community_id, :string
  end
end
