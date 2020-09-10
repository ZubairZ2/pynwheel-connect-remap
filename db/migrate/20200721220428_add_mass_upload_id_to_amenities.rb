class AddMassUploadIdToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :mass_upload_id, :string
  end
end
