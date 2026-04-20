class BackfillPublishedConfigJson < ActiveRecord::Migration[7.0]
  def up
    CalculatorConfig.where(published_config_json: nil).where.not(config_json: nil).find_each do |config|
      config.update_columns(
        published_config_json: config.config_json,
        published_at: config.updated_at
      )
    end
  end

  def down
    # Not reversible — do not wipe published data on rollback
  end
end
