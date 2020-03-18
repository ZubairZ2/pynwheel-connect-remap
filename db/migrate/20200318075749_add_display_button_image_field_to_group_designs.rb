class AddDisplayButtonImageFieldToGroupDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :group_designs, :display_button_image, :boolean, default: false
  end
end
