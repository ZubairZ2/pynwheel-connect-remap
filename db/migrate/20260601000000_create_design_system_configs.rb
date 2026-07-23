class CreateDesignSystemConfigs < ActiveRecord::Migration[7.0]
  def change
    create_table :design_system_configs do |t|
      t.references :community, null: false, foreign_key: true, index: { unique: true }
      t.jsonb :config_json, null: false, default: {}
      t.timestamps
    end
  end
end
