class CreateCrmSources < ActiveRecord::Migration[5.0]
  def change
    create_table :crm_discovery_sources do |t|
      t.jsonb :sources

      t.references :community, foreign_key: true
      t.timestamps
    end
  end
end
