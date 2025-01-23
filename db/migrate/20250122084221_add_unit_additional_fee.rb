class AddUnitAdditionalFee < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :additional_fee, :string, default: ""
  end
end
