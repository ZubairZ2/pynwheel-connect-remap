class AddPointerDataInAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :pointer_data, :jsonb, default: {}
  end
end
