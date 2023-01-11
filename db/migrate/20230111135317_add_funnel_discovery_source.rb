class AddFunnelDiscoverySource < ActiveRecord::Migration[5.0]
  def change
    add_column :schedual_tours, :funnel_prospect_discover_source, :string, default: ""
  end
end
