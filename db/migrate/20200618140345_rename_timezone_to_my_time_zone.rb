class RenameTimezoneToMyTimeZone < ActiveRecord::Migration[5.0]
  def change
    rename_column :tour_histories, :timezone, :my_time_zone
  end
end
