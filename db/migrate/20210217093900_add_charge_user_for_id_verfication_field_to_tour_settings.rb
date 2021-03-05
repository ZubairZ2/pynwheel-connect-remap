class AddChargeUserForIdVerficationFieldToTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :charge_user_for_id_verfication, :boolean, default: false
  end
end
