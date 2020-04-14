class AddVisualIdVerificationFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :visual_id_verification, :boolean, default: true
  end
end
