class AddAccessTimeResidentAccessPoint < ActiveRecord::Migration[5.0]
  def change
    add_column :resident_access_points, :access_time, :datetime
    add_column :resident_access_points, :is_accessed, :boolean, default: false
  end
end
