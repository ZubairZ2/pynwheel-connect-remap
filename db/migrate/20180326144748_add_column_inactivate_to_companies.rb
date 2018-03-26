class AddColumnInactivateToCompanies < ActiveRecord::Migration[5.0]
  def change
    add_column :companies, :inactivate, :boolean, default: false
  end
end
