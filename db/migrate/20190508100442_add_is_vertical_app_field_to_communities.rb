class AddIsVerticalAppFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :is_vertical_app, :boolean, default: false
  end
end
