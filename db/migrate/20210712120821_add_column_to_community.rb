class AddColumnToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :tour_completed_at, :datetime
  end
end
