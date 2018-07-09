class AddBooleanFieldsForButtonImagesToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :filter_button_as_image, :boolean,default: false
    add_column :designs, :gallery_button_as_image, :boolean,default: false
    add_column :designs, :filter_panel_background_as_image, :boolean,default: false
  end
end
