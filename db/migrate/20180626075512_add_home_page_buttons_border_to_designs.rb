class AddHomePageButtonsBorderToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :home_page_buttons_border, :string
  end
end
