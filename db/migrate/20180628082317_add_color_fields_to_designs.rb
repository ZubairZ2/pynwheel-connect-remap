class AddColorFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :home_page_navigation_button_color, :string
    add_column :designs, :home_page_navigation_font_color, :string
  end
end
