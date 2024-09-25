class AddTourVisitingOrderNumber < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :tour_visiting_order_number, :integer
    add_column :amenities, :tour_visiting_order_number, :integer
  end
end