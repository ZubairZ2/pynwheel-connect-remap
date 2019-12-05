class AddOverlayTextPositionFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :overlay_text_position, :string
  end
end
