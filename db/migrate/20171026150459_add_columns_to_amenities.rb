class AddColumnsToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :name, :string
    add_column :amenities, :image, :string
    add_column :amenities, :x_plot, :integer
    add_column :amenities, :y_plot, :integer
    add_reference :amenities, :amenityable, index: true, polymorphic: true
  end
end
