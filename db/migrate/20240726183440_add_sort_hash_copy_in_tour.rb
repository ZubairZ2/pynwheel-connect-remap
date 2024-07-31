class AddSortHashCopyInTour < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :copy_sort_hash, :json, null: false, default: '{}'
  end
end
