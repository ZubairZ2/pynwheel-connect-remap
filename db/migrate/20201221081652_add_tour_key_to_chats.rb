class AddTourKeyToChats < ActiveRecord::Migration[5.0]
  def change
    add_column :chats, :tour_key, :string
  end
end
