class AddEmailHeaderColorFieldToTourSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :tour_settings, :email_header_color, :string, default: "#808080"
    add_column :tour_settings, :email_footer_color, :string, default: "#808080"
    add_column :tour_settings, :enable_header_footer, :boolean, default: true
  end
end
