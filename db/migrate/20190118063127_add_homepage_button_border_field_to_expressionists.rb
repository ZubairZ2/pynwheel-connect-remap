class AddHomepageButtonBorderFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :homepage_button_border, :string
  end
end
