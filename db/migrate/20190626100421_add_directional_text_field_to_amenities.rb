class AddDirectionalTextFieldToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :directional_text, :string
  end
end
