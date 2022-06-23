class AddFunnelAttributesIntoSchedualTour < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :funnel_prospect_id, :string
    add_column :schedual_tours, :funnel_appointment_id, :string
  end
end
