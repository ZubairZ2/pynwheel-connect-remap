class AddCommunityLogoInSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :community_logo, :boolean, default: true
  end
end
