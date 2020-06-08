class AddClientDateToChat < ActiveRecord::Migration[5.0]
  def change
    add_column :chats, :client_date, :string
  end
end
