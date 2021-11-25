class AddSalesforceTourBookingIdIntoSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :salesforce_tour_booking_id, :string, default: ""
  end
end
