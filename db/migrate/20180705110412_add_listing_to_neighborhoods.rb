class AddListingToNeighborhoods < ActiveRecord::Migration[5.0]
  def change
    add_column :neighborhoods, :listing, :text
  end
end
