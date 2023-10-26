class ChangeDefaultPynwheelAccess < ActiveRecord::Migration[5.0]
  def change
    change_column_default :communities, :pynwheel_access, false 
  end
end