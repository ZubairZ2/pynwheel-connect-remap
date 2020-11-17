class CreateLatches < ActiveRecord::Migration[5.0]
  def change
    create_table :latches do |t|
      t.string :client_id
      t.string :client_secret
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
