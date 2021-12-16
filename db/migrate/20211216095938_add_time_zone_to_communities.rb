class AddTimeZoneToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :time_zone, :string, default: "UTC"
  end
end
