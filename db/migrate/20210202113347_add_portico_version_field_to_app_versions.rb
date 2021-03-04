class AddPorticoVersionFieldToAppVersions < ActiveRecord::Migration[5.0]
  def change
    add_column :app_versions, :portico_version, :integer, default: 1
  end
end
