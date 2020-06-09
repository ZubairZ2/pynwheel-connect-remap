class CreateChatrooms < ActiveRecord::Migration[5.0]
  def change
    create_table :chatrooms do |t|
      t.references :tour_user, foreign_key: true
      t.references :tour, foreign_key: true

      t.timestamps
    end
  end
end
