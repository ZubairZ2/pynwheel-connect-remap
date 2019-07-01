class AddDirectionalTextFieldToAmenityGalleries < ActiveRecord::Migration[5.0]
  def change
    add_column :amenity_galleries, :directional_text, :string
  end
end
