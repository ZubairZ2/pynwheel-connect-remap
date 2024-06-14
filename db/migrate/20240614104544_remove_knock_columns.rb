class RemoveKnockColumns < ActiveRecord::Migration[5.0]
  def change
    remove_column :crm_credentials, :knock_api_key, if_exists: true
    remove_column :crm_credentials, :knock_sms_consent_url, if_exists: true
  end
end
