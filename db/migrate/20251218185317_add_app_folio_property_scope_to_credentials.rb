class AddAppFolioPropertyScopeToCredentials < ActiveRecord::Migration[7.2]
  def change
    add_column :credentials, :app_folio_property_scope, :string,
               null: false,
               default: "is_app_folio_property_id"

    add_column :credentials, :app_folio_property_group_id, :string
    add_index :credentials, :app_folio_property_scope
  end
end
