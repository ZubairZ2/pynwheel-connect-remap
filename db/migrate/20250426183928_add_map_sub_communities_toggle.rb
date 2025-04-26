class AddMapSubCommunitiesToggle < ActiveRecord::Migration[7.2]
  def change
    add_column :credentials, :allow_sub_communities, :boolean, :default => false
  end
end
