class AddNeighborhoodRequestCounterFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :neighborhood_request_counter, :integer, default: 0
    add_column :communities, :neighborhood_request_counter_limit, :integer, default: 300
    add_column :communities, :limit_200_hit, :boolean , default: false
    add_column :communities, :limit_400_hit, :boolean , default: false
  end
end
