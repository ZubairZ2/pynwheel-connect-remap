class Change < ActiveRecord::Migration[5.0]
  def change
    change_column :designs, :modernist_ebrochure_header_background_color, :string, :default => "No color"
    change_column :designs, :expressionist_ebrochure_header_background_color, :string, :default => "No color"
  end
end
