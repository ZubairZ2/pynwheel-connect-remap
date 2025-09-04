class ChangeDefaultFloorplanColors < ActiveRecord::Migration[7.2]
  def change
    change_column_default :floorplans, :available_units_color, from: '#00FF00', to: '#f9d648'
    change_column_default :floorplans, :model_units_color, from: '#FF0000', to: '#f57396'
  end
end
