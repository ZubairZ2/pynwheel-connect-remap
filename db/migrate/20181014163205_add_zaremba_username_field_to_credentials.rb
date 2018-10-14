class AddZarembaUsernameFieldToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :zaremba_username, :string
    add_column :credentials, :zaremba_password, :string
    add_column :credentials, :zaremba_filename, :string
  end
end
