class AddGlobalNavigationButtonOnFontColorToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :global_navigation_button_on_font_color, :string
  end
end
