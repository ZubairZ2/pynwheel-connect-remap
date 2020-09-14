class AddTimeIntervelFieldInTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :time_intervel, :string, default: "15 min"
  end
end
