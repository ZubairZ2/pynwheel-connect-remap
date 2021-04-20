class AddPynwheelAccessInSettings < ActiveRecord::Migration[5.0]
  def change
  	add_column :communities, :pynwheel_access, :boolean, default: true
  end
end
