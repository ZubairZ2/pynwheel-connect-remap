class AddTourTypeDetailsToPortalTourStop < ActiveRecord::Migration[5.0]
  def change
    add_column :portal_tour_stops, :tour_stop_details, :string
    add_column :portal_tour_stops, :amenity_type, :string
  end
end
