class AddAppFolioAttributes < ActiveRecord::Migration[7.2]
  def change
    add_column :credentials, :app_folio_property_id, :string, default: ""
  end
end
