class AddPropertyTourTypeToSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :property_tour_type, :string
  end
end
