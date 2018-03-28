class AddApiTokenToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :api_token, :string
  end
end
