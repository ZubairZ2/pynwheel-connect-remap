class AddActiveAppFieldToTourHistories < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :active_app, :boolean, default: true
  end
end
