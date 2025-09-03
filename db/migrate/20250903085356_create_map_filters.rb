class CreateMapFilters < ActiveRecord::Migration[7.2]
  def change
    create_table :map_filters do |t|
      t.references :community, null: false, foreign_key: true, index: { unique: true }

      t.boolean :marketing_properties_enabled, default: true, null: false
      t.boolean :marketing_bedrooms_enabled, default: true, null: false
      t.boolean :marketing_pricing_enabled, default: true, null: false
      t.boolean :marketing_square_feet_enabled, default: true, null: false
      t.boolean :marketing_availability_enabled, default: true, null: false

      t.boolean :ops_properties_enabled, default: true, null: false
      t.boolean :ops_bedrooms_enabled, default: true, null: false
      t.boolean :ops_pricing_enabled, default: true, null: false
      t.boolean :ops_square_feet_enabled, default: true, null: false
      t.boolean :ops_availability_enabled, default: true, null: false

      t.timestamps
    end
  end
end