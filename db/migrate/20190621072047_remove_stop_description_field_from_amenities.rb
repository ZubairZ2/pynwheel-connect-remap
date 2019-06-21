class RemoveStopDescriptionFieldFromAmenities < ActiveRecord::Migration[5.0]
  def change
    remove_column :amenities, :stop_description, :string
  end
end
