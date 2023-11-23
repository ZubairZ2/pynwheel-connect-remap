class AddDataProviderFieldToCompanies < ActiveRecord::Migration[5.0]
  def change
    add_column :companies, :data_providers, :string, array: true, default: []
  end
end