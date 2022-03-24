class AddHardwareSpecToDesign < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :pynwheel_touch_hardware_spec, :string
  end
end
