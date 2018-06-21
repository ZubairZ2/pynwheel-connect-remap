class AddButtonsAsImageToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :buttons_as_image, :boolean ,default: false
  end
end
