class AddImageBitToTourUsers < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_users, :image_bit, :boolean, default: false
  end
end
