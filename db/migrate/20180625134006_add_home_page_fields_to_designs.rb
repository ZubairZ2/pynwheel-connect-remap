class AddHomePageFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :home_page_button_shape, :string
    add_column :designs, :home_page_navigation_background_height, :string
    add_column :designs, :home_page_buttons_height, :string
    add_column :designs, :home_page_buttons_width, :string
    add_column :designs, :home_page_buttons_opacity, :string
    add_column :designs, :home_page_navigation_background_opacity, :string
  end
end
