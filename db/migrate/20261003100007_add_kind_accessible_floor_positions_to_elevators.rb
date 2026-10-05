# A vertical connector's kind (elevator | stairs | ramp), whether it is
# step-free, and an optional per-floor position override. Defaults keep
# every existing row an accessible elevator; the legacy router and the
# existing mobile app never read these columns.
class AddKindAccessibleFloorPositionsToElevators < ActiveRecord::Migration[7.2]
  def change
    add_column :elevators, :kind, :string, null: false, default: 'elevator'
    add_column :elevators, :accessible, :boolean, null: false, default: true
    # {"3": {"x": 118, "y": 46}} per-floor override of x_plot/y_plot
    add_column :elevators, :floor_positions, :jsonb, null: false, default: {}
    add_index :elevators, %i[community_id kind]
  end
end
