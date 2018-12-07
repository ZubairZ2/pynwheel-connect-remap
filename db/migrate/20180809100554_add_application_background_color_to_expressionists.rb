class AddApplicationBackgroundColorToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :application_background_color, :string
  end
end
