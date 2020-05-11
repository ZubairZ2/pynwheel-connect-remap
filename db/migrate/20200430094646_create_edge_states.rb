class CreateEdgeStates < ActiveRecord::Migration[5.0]
  def change
    create_table :edge_states do |t|
      t.string :client_id
      t.string :client_secret
      t.references :user, foreign_key: true
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
