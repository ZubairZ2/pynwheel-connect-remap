class AddAccessCodeFieldToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :access_code, :string
  end
end
