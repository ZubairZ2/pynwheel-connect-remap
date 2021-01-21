class AddLengthStayLimitFieldToTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :length_stay_limit, :integer, default: 45
  end
end
