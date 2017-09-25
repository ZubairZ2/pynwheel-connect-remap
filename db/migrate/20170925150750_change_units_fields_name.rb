class ChangeUnitsFieldsName < ActiveRecord::Migration[5.0]
  def change
  	 rename_column :units, :name, :unit_type
  	 rename_column :units, :number, :marketing_name
  	 rename_column :units, :avg_rent, :market_rent
  	 rename_column :units, :min_rent, :effective_rent
  	 remove_column :units, :max_rent
  end
end
