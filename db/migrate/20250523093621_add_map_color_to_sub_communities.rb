class AddMapColorToSubCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :sub_communities, :map_marker_color, :text, default: "#d37474"
  end
end