class ChangeMarketingNameToBeStringInUnits < ActiveRecord::Migration[5.0]
  def change
  	change_column :units, :marketing_name, :string
  end
end
