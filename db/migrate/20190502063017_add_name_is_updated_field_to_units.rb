class AddNameIsUpdatedFieldToUnits < ActiveRecord::Migration[5.0]
  def change
    add_column :units, :name_is_updated, :boolean
    add_column :units, :floorplan_id_is_updated, :boolean
    add_column :units, :effective_rent_is_updated, :boolean
    add_column :units, :available_date_is_updated, :boolean
    add_column :units, :available_is_updated, :boolean
    add_column :units, :sold_is_updated, :boolean
    add_column :units, :floor_is_updated, :boolean
  end
end
