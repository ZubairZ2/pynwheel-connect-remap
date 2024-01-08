class ChangeDefaultColor < ActiveRecord::Migration[5.0]
  def change
    change_column_default :tours, :dotted_line_color, "blue" 
  end
end
