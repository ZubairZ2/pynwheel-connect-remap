class AddHomepageButtonBorderThicknessFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :homepage_button_border_thickness, :string
    add_column :expressionists, :global_navigation_home_icon, :boolean , default: false
  end
end
