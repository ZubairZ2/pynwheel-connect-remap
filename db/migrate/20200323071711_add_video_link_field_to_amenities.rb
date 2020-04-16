class AddVideoLinkFieldToAmenities < ActiveRecord::Migration[5.0]
  def change
    add_column :amenities, :video_link, :string
  end
end
