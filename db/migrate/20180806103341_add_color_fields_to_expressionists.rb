class AddColorFieldsToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :spacing_between_buttons, :string
    add_column :expressionists, :button_on_bg_color, :string
    add_column :expressionists, :display_button_on_bg_color, :boolean,default: false
  end
end
