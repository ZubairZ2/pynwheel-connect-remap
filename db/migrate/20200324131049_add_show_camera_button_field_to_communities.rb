class AddShowCameraButtonFieldToCommunities < ActiveRecord::Migration[5.0]
  def change
    add_column :communities, :show_camera_button, :boolean, :default => true
    add_column :communities, :show_notepad_button, :boolean, :default => true
  end
end
