class SetDefaultValueOfDisplayGlobalNavigationButtonBgColorInExpressionists < ActiveRecord::Migration[5.0]
  def change
    change_column :expressionists, :display_global_navigation_button_bg_color, :boolean, default: true
  end
end
