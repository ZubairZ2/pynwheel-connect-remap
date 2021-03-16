class AddColumnsInTourHistories < ActiveRecord::Migration[5.0]
  def change
  	add_column :tour_histories, :see_availability_counter, :integer, default: 0
  	add_column :tour_histories, :apply_clicks_counter, :integer, default: 0
  	add_column :tour_histories, :price_opened_counter, :integer, default: 0
  	add_column :tour_histories, :notes_opened_counter, :integer, default: 0
  	add_column :tour_histories, :camera_opened_counter, :integer, default: 0
  	add_column :tour_histories, :visited_pages_counter, :integer, default: 0
  	add_column :tour_histories, :tour_type, :string, default: ""
  	add_column :tour_histories, :tour_state, :string, default: "abandoned"
  end
end
