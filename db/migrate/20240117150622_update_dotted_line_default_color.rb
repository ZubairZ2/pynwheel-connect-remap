class UpdateDottedLineDefaultColor < ActiveRecord::Migration[5.0]
  def change
    change_column_default :tours, :dotted_line_color, "#008FD5"
  end
end
