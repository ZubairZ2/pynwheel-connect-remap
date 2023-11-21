class AddCompanyLevelCredentialToggleToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :use_company_level_data_settings, :boolean, default: true
  end
end
