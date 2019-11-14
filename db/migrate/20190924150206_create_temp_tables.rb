class CreateTempTables < ActiveRecord::Migration[5.0]
  def change
    create_table :temp_tables do |t|
      t.string :community_log
      t.string :community_log1
      t.timestamps
    end
  end
end
