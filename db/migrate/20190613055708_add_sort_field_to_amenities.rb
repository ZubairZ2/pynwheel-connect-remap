class AddSortFieldToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :sort, :integer
    add_column :amenities, :stop_description, :string
  end
end
