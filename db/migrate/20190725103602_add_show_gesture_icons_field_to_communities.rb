class AddShowGestureIconsFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :show_gesture_icons, :boolean, default: true
  end
end
