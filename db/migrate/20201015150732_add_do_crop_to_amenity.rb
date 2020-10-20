class AddDoCropToAmenity < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :do_crop, :boolean
  end
end
