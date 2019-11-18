class AddOverlayTextFieldToExpressionist < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :overlay_text, :string
    add_column :expressionists, :overlay_font, :string
    add_column :expressionists, :overlay_size, :string
    add_column :expressionists, :overlay_color, :string
    add_column :expressionists, :overlay_opacity, :string
  end
end
