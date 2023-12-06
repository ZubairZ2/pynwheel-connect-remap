class AddYardiUsernamePasswordToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :yardi_username, :string
    add_column :credentials, :yardi_password, :string
  end
end
