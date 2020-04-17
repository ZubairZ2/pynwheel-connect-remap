class AddChatControlToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :char_control, :boolean, default: false
  end
end
