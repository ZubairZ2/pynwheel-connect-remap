class AddSortHashFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :sort_hash, :json, null: false, default: '{}'
  end
end
