class AddFloorFieldToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :floor, :integer
  end
end
