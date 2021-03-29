class AddNoShowInTourHistory < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :not_on_time, :boolean, default: false
  end
end
