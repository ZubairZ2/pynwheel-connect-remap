class AddDesiredBedroomFieldToSchedualTours < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :desired_bedroom, :integer
    add_column :schedual_tours, :desired_move_in_date, :date
  end
end
