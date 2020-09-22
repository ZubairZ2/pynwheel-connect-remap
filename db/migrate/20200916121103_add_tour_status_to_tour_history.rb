class AddTourStatusToTourHistory < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :tour_status, :string
  end
end

