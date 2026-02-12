class AddHideBedroomsBathroomsToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :hide_bedrooms_bathrooms, :boolean, default: false
  end
end
