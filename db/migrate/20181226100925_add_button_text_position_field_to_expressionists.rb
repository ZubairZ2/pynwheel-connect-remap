class AddButtonTextPositionFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :button_text_position, :string
    add_column :expressionists, :display_global_navigation_button_color, :boolean, default: false
  end
end
