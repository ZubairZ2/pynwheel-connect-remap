class AddOpacityFieldsToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :button_on_bg_color_opacity, :string
    add_column :expressionists, :application_background_color_opacity, :string
  end
end
