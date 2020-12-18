class AddDetailsToProspects < ActiveRecord::Migration[5.0]
  def change
    add_column :prospects, :crm_provider, :string
    add_column :prospects, :tour_key, :string
    add_column :prospects, :sf_booking_id, :string
    add_column :prospects, :sf_booking_name, :string
    add_column :prospects, :sf_guest_id, :string
    add_column :prospects, :sf_status, :string, default: ""
  end
end
