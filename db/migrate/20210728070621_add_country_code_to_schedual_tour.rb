class AddCountryCodeToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :country_code, :string
  end
end
