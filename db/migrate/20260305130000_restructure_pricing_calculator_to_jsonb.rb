class RestructurePricingCalculatorToJsonb < ActiveRecord::Migration[6.1]
  def change
    # Drop nested tables — all data is now stored in config_json
    drop_table :calculator_fees       if table_exists?(:calculator_fees)
    drop_table :calculator_categories if table_exists?(:calculator_categories)
    drop_table :calculator_buckets    if table_exists?(:calculator_buckets)

    # Replace normalised columns with a single JSONB blob on calculator_configs
    remove_column :calculator_configs, :global_property_disclaimers, if_exists: true
    add_column    :calculator_configs, :config_json, :jsonb, default: {}, null: false
    add_index     :calculator_configs, :config_json, using: :gin
  end
end
