class AddRegionIdInUser < ActiveRecord::Migration[5.0]
  def change
    add_reference :users, :region, index: true
  end
end
