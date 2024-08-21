class AddPynwheelLaunchCompany < ActiveRecord::Migration[5.0]
  def change
    add_column :company_settings, :pynwheel_launch_access, :boolean, :default => false
  end
end
