class RemoveDisplayGlobalNavigationButtonBorderColorFromExpressionists < ActiveRecord::Migration[5.0]
  def change
    remove_column :expressionists, :display_global_navigation_button_border_color
  end
end
