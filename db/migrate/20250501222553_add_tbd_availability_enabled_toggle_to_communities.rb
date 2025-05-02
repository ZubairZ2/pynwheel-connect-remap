class AddTbdAvailabilityEnabledToggleToCommunities < ActiveRecord::Migration[7.2]
  def change
    add_column :communities, :display_tbd_legend, :boolean, default: false
  end
end
