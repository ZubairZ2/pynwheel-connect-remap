class AddKnockCompanyId < ActiveRecord::Migration[5.0]
  def change
    add_column :crm_credentials, :knock_company_id, :string, default: ""
  end
end
