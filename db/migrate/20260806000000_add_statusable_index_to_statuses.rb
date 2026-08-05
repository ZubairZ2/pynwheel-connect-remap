class AddStatusableIndexToStatuses < ActiveRecord::Migration[7.2]
  disable_ddl_transaction!

  # Every `has_one :status, as: :statusable` lookup was a sequential scan on
  # `statuses`. LaunchStatusable checks for a status on each floorplan and
  # credential write, which importers do in bulk, so the lookup needs to be
  # cheap.
  def up
    return if index_exists?(:statuses, [:statusable_type, :statusable_id], name: "index_statuses_on_statusable")

    add_index :statuses,
              [:statusable_type, :statusable_id],
              name: "index_statuses_on_statusable",
              algorithm: :concurrently
  end

  def down
    return unless index_exists?(:statuses, [:statusable_type, :statusable_id], name: "index_statuses_on_statusable")

    remove_index :statuses, name: "index_statuses_on_statusable", algorithm: :concurrently
  end
end
