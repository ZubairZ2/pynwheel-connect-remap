class AddButtonAsImageFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :global_nav_button_on_as_image, :boolean,default: false
    add_column :designs, :global_nav_button_off_as_image, :boolean,default: false
  end
end
