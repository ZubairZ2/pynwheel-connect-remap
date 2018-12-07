class AddFieldsToHomeScreens < ActiveRecord::Migration[5.0]
  def change
    add_column :home_screens, :about_button, :string
    add_column :home_screens, :floorplan_button, :string
  end
end
