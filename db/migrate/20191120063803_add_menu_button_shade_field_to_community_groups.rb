class AddMenuButtonShadeFieldToCommunityGroups < ActiveRecord::Migration[5.0]
  def change
    add_column :community_groups, :menu_button_shade, :string, default: "light"
  end
end
