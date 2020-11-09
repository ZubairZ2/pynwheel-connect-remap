class AddFieldDoLimitMaxTourToTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :do_limit_max_tour, :boolean, default: false
    add_column :tour_settings, :limit_max_tour, :string, default: "scheduling"
  end
end
