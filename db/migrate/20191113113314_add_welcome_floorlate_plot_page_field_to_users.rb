class AddWelcomeFloorlatePlotPageFieldToUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :welcome_floorplate_plot_page, :boolean, default: true
  end
end
