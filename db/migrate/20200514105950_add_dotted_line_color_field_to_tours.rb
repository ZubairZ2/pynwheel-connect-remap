class AddDottedLineColorFieldToTours < ActiveRecord::Migration[5.0]
  def change
    add_column :tours, :dotted_line_color, :string, default: "green"
  end
end
