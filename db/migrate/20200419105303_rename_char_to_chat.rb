class RenameCharToChat < ActiveRecord::Migration[5.0]
  def change
    rename_column :communities, :char_control, :chat_control
  end
end
