class AddDisplayOnHomepageFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_unit_on_homepage, :boolean, default: true
  end
end
