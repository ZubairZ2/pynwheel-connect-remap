class AddMarkerIconSizeFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :marker_icon_size, :string
  end
end
