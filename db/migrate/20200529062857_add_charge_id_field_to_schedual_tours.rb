class AddChargeIdFieldToSchedualTours < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :charge_id, :string
    add_column :schedual_tours, :pay_back_id, :string
  end
end
