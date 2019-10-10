class AddImageFieldToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :image, :string
    add_column :tour_users, :id_card, :string
  end
end
