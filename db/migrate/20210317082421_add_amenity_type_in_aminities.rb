class AddAmenityTypeInAminities < ActiveRecord::Migration[5.0]
  def change
  	add_column :amenities, :amenity_type, :string, default: ""
  end
end
