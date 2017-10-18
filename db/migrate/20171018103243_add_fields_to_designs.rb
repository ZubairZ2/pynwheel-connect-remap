class AddFieldsToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :logo_position, :string
    add_column :designs, :secondary_logo_position, :string
    add_column :designs, :secondary_page_background_image, :string
    add_column :designs, :global_navigation_position, :string
  end
end
