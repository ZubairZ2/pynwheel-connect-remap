class AddTourKeyToChatroom < ActiveRecord::Migration[5.0]
  def change
    add_column :chatrooms, :tour_key, :string
  end
end
