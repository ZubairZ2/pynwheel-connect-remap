class CreateLatchAuthTokens < ActiveRecord::Migration[5.0]
  def change
    create_table :latch_auth_tokens do |t|
      t.references :tour_user, null: false, foreign_key: true
      t.string :token, null: true
      t.datetime :expires_at, null: true

      t.timestamps
    end
  end
end
