class AddIsChatLoginToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :is_chat_available, :boolean
  end
end
