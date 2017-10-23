class AddBuildingButtonToHomeScreens < ActiveRecord::Migration[5.0]
  def change
    add_column :home_screens, :building_button, :string
  end
end
