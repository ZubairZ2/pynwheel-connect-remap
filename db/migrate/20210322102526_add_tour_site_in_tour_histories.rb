class AddTourSiteInTourHistories < ActiveRecord::Migration[5.0]
  def change
  	add_column :tour_histories, :tour_site, :string, default: ""
  end
end
