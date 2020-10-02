class AddChatEnableToCommunityUser < ActiveRecord::Migration[5.0]
  def change
    add_column :community_users, :chat_enable, :boolean
  end
end
