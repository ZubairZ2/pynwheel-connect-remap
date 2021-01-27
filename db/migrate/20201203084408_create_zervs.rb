class CreateZervs < ActiveRecord::Migration[5.0]
  def change
    create_table :zervs do |t|
      t.string :username
      t.string :password
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end
