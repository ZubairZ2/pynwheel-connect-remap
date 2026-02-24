class AddHideAvailabilityToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :hide_availability, :boolean, default: false
  end
end
