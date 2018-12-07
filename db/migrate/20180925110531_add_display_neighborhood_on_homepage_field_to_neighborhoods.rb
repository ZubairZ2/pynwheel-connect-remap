class AddDisplayNeighborhoodOnHomepageFieldToNeighborhoods < ActiveRecord::Migration[5.0]
  def change
    add_column :neighborhoods, :display_neighborhood_on_homepage, :boolean, default: true
  end
end
