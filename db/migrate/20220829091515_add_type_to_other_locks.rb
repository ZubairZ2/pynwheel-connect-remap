class AddTypeToOtherLocks < ActiveRecord::Migration[5.0]
  def change
    add_column :other_locks, :area_type, :string
  end
end
