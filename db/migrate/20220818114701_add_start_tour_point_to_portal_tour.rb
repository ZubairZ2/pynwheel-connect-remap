class AddStartTourPointToPortalTour < ActiveRecord::Migration[5.0]
  def change
    add_column :portal_tours, :start_tour_point, :string
  end
end
