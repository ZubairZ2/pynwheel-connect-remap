class AddTourBookingNameIntoSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :salesforce_tour_booking_name, :string, default: ""
  end
end
