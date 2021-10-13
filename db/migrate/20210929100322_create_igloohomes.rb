class CreateIgloohomes < ActiveRecord::Migration[5.0]
  def change
    create_table :igloohomes do |t|
      t.string :username
      t.string :password
      t.references :community, foreign_key: true

      t.timestamps
    end
  end
end