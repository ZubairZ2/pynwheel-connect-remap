class AddEbrochureHeaderBackgroundColorFieldToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :futurist_ebrochure_header_background_color, :string, default: "#808080"
    add_column :designs, :modernist_ebrochure_header_background_color, :string, default: "#808080"
    add_column :designs, :gables_ebrochure_header_background_color, :string, default: "#808080"
    add_column :designs, :panther_ebrochure_header_background_color, :string, default: "#808080"
    add_column :designs, :expressionist_ebrochure_header_background_color, :string, default: "#808080"
    add_column :designs, :display_ebrochure_header_background_color, :boolean, default: false
  end
end
