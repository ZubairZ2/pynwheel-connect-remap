class AddGetUnitTypeEnableToggle < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :enable_unit_type_pricing, :boolean, default: false
  end
end
