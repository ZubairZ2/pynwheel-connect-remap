class AddFunnelAttributesInToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :crm_credentials, :funnel_api_key, :string, default: ""
    add_column :crm_credentials, :funnel_community_id, :string, default: ""
  end
end
