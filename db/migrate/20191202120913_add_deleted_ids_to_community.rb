class AddDeletedIdsToCommunity < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :deleted_ids, :integer, array: true, default: []
  end
end
