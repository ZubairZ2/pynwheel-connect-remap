class AddPorticoVersionFieldToAppVersions < ActiveRecord::Migration[5.0]
  def change
    add_column :app_versions, :portico_version, :string, default: "1.0.0"
  end
end
