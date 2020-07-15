class AddDesiredBedroomFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :desired_bedroom, :integer
  end
end
