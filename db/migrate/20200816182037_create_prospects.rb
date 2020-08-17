class CreateProspects < ActiveRecord::Migration[5.0]
  def change
    create_table :prospects do |t|
      t.references :community, foreign_key: true
      t.string :data_provider
      t.references :tour_user, foreign_key: true
      t.jsonb :data

      t.timestamps
    end
  end
end
