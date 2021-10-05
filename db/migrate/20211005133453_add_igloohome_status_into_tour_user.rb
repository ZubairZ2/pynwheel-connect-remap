class AddIgloohomeStatusIntoTourUser < ActiveRecord::Migration[5.0]
  def change
    add_column :pynwheel_access_users, :igloohome_status, :string
    add_column :tour_users, :igloohome_status, :string
  end
end
