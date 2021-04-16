class AddRefreshTokenToEdgeState < ActiveRecord::Migration[5.0]
  def change
    add_column :edge_states, :refresh_token, :string
  end
end
