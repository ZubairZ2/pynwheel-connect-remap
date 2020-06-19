class AddTimezoneToTourHistory < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_histories, :timezone, :string
  end
end
