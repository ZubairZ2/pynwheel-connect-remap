class AddGlobalNavButtonIconSizeFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :global_nav_button_icon_size, :string
  end
end
