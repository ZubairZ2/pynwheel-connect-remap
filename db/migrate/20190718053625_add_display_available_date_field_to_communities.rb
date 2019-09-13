class AddDisplayAvailableDateFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :display_available_date, :boolean, default: true
  end
end
