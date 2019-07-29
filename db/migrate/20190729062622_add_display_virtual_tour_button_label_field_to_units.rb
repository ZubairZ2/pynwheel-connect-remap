class AddDisplayVirtualTourButtonLabelFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :display_virtual_tour_button_label, :boolean, default: false
    add_column :units, :virtual_tour_button_label, :string, default: "3D Tour"
    add_column :units, :virtual_tour_url, :string
  end
end
