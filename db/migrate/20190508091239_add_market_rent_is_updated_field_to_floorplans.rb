class AddMarketRentIsUpdatedFieldToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :market_rent_is_updated, :boolean
  end
end
