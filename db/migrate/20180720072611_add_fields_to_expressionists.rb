class AddFieldsToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :display_global_navigation_button_icon, :boolean,default: true
    add_column :expressionists, :display_home_page_image, :boolean,default: false
    add_column :expressionists, :global_navigation_button_border_color, :string
  end
end
