class AddDetailsInCommunityUsers < ActiveRecord::Migration[5.0]
  def change
    # rename_column :communities, :is_chat_login, :is_chat_available
    add_column :community_users, :is_logged_in, :boolean, default: false
    change_column_default :community_users, :chat_enable, false
  end
end
