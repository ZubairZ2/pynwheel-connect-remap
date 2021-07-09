class AddIsTourCompletedInSheduledTour < ActiveRecord::Migration[5.0]
  def change
  	add_column :schedual_tours, :is_tour_completed, :boolean, default: false
  end
end
