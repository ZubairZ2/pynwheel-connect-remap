class AddDisplayVirtualTourButtonLabelFieldToFloorplans < ActiveRecord::Migration[5.0]
  def change
    add_column :floorplans, :display_virtual_tour_button_label, :boolean, default: false
    add_column :floorplans, :virtual_tour_button_label, :string, default: "3D Tour"
  end
end
