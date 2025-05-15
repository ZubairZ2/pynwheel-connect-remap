class AddShowCurrentAvailabilityInCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :show_current_availability, :boolean, default: false
  end
end
