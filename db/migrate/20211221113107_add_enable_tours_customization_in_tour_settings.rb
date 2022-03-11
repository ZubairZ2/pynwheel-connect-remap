class AddEnableToursCustomizationInTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :enable_tour_customization, :boolean, default: false
  end
end
