class AddKnockAttributesIntoSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :knock_prospect_id, :string
    add_column :schedual_tours, :knock_appointment_id, :string
    add_column :schedual_tours, :knock_prospect_ip_address, :string
  end
end
