class AddShowMapFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :show_map, :boolean, default: true
    add_column :communities, :mdu, :boolean, default: true
  end
end
