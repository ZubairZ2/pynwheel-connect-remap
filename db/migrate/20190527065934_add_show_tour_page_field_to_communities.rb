class AddShowTourPageFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :show_tour_page, :boolean
  end
end
