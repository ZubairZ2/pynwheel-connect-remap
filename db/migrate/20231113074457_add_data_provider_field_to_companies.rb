class AddDataProviderFieldToCompanies < ActiveRecord::Migration[5.0]
  def change
    add_column :companies, :data_provider, :string
  end
end
