class AddFilterPanelLabelColorFieldToDesign < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :filter_panel_label_color, :string
    add_column :designs, :filter_panel_label_opacity, :string
  end
end
