class AddFieldZoomToNeighborhoods < ActiveRecord::Migration[5.0]
  def change
    add_column :neighborhoods, :zoom, :integer
  end
end
