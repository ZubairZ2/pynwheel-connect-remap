class AddFieldModernistPropertyMapColor < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :modernist_map_marker_color, :string, default: 'no color'
  end
end
