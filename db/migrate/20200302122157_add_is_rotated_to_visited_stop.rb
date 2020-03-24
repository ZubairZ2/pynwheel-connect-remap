class AddIsRotatedToVisitedStop < ActiveRecord::Migration[5.0]
  def change
    add_column :visited_stops, :is_rotated, :boolean, :default => true
  end
end
