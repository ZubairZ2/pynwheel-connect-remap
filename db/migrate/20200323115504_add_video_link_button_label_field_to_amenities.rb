class AddVideoLinkButtonLabelFieldToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :video_link_button_label, :string, default: "3D Tour"
  end
end
