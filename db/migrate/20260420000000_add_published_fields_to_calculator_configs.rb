class AddPublishedFieldsToCalculatorConfigs < ActiveRecord::Migration[7.0]
  def change
    add_column :calculator_configs, :published_config_json, :jsonb
    add_column :calculator_configs, :published_at, :datetime
  end
end
