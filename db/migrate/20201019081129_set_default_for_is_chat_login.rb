class SetDefaultForIsChatLogin < ActiveRecord::Migration[5.0]
  def change
    change_column :communities, :is_chat_login, :boolean, default: false
  end
end
