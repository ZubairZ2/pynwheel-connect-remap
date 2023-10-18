class AddUserScoppedCredentialsToLatch < ActiveRecord::Migration[5.0]
  def change
    add_column :latches, :passwordless_client_id, :string, :default => ""
    add_column :latches, :passwordless_client_secret, :string, :default => ""
  end
end