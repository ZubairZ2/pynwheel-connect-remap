class AddFnameLnameToTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :first_name, :string
    add_column :tour_users, :last_name, :string
  end
end
