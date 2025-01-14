class AddUnitsAvailabilityToggleIntoCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :units_availability_over_120_days, :boolean, default: true
  end
end
