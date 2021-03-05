class CreateUserCustomizedTours < ActiveRecord::Migration[5.0]
  def change
    create_table :user_customized_tours do |t|
      t.references :community, foreign_key: true
      t.references :tour_user, foreign_key: true
      t.references :tour, foreign_key: true

      t.timestamps
    end

    add_index(:user_customized_tours, [:community_id, :tour_user_id, :tour_id], unique: true, name: "Add index on community_id, tour_user_id and tour_id")

  end
end