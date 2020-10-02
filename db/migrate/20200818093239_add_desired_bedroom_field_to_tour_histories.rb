class AddDesiredBedroomFieldToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :desired_bedroom, :integer
  end
end
