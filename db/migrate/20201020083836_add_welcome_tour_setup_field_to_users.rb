class AddWelcomeTourSetupFieldToUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :users, :welcome_tour_setup, :boolean, default: false
    add_column :users, :welcome_tour_setting, :boolean, default: false
  end
end
