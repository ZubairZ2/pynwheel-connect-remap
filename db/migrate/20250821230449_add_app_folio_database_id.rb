class AddAppFolioDatabaseId < ActiveRecord::Migration[7.2]
  def change
    add_column :credentials, :app_folio_database_id, :string, default: ""
  end
end
