class AddRealpageMarketingSourcesToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :credentials, :realpage_marketing_sources, :jsonb
  end
end
