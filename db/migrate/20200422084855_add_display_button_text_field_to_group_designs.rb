class AddDisplayButtonTextFieldToGroupDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :group_designs, :display_button_text, :boolean, default: true
  end
end
