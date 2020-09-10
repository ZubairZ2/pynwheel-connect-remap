class AddBuildingFieldToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :building, :string
  end
end
