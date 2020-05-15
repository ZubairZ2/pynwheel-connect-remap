class RenameSecureIdToUuid < ActiveRecord::Migration[5.0]
  def change
    rename_column :communities, :secure_id, :uuid
    rename_column :users, :secure_id, :uuid
  end
end
