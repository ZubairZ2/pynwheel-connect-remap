class AddSortFieldToAmenityGalleries < ActiveRecord::Migration[5.0]
  def change
    add_column :amenity_galleries, :sort, :integer
  end
end
