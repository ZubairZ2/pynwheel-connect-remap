class AddPynwheelTouchFieldToTutorials < ActiveRecord::Migration[5.0]
  def change
    add_column :tutorials, :pynwheel_touch, :boolean, default: true
    add_column :tutorials, :pynwheel_maps, :boolean, default: true
    add_column :tutorials, :self_tour, :boolean, default: true
  end
end
