class AddRandomNumberToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :random_number, :integer
  end
end
