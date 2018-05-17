class AddStandardImageUrlToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :standard_image_url, :string
  end
end
