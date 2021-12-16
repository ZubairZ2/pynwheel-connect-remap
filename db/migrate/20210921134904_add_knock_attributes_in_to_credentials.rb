class AddKnockAttributesInToCredentials < ActiveRecord::Migration[5.0]
  def change
    add_column :crm_credentials, :knock_api_key, :string, default: ""
    add_column :crm_credentials, :knock_community_id, :string, default: ""
    add_column :crm_credentials, :knock_sms_consent_url, :string, default: ""
  end
end
