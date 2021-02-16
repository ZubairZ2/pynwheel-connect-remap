class CommunityLocksUpdates < ActiveRecord::Migration[5.0]
  def up
  	add_column :units, :lock_provider, :string, default: ""
  	add_column :amenities, :lock_provider, :string, default: ""
  	add_column :building_starting_points, :lock_provider, :string, default: ""
  	add_column :elevators, :lock_provider, :string, default: ""
  	add_column :tours, :lock_provider, :string, default: ""
    add_column :communities, :multiple_locks_provider, :string, array: true, default: []
    add_column :tours, :access_code, :string
    add_column :elevators, :access_code, :string
  end

  def down
  	remove_column :units, :lock_provider, :string, default: ""
  	remove_column :amenities, :lock_provider, :string, default: ""
  	remove_column :building_starting_points, :lock_provider, :string, default: ""
  	remove_column :elevators, :lock_provider, :string, default: ""
  	remove_column :tours, :lock_provider, :string, default: ""
    remove_column :communities, :multiple_locks_provider, :string, array: true, default: []
    remove_column :tours, :access_code, :string
    remove_column :elevators, :access_code, :string
  end
end
