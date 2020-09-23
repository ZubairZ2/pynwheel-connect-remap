class AddCropAttributesToAmenity < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :crop_x, :float
    add_column :amenities, :crop_y, :float
    add_column :amenities, :crop_w, :float
    add_column :amenities, :crop_h, :float
  end
end
