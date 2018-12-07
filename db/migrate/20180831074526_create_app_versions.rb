class CreateAppVersions < ActiveRecord::Migration[5.0]
  def change
    create_table :app_versions do |t|
      t.string :version

      t.timestamps
    end
  end
end
