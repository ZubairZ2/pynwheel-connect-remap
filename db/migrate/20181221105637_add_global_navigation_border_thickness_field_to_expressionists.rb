class AddGlobalNavigationBorderThicknessFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :global_navigation_border_thickness, :string
    add_column :expressionists, :home_page_logo_visible, :boolean, default: false
    add_column :expressionists, :gables_home_page_images, :boolean, default: false
    add_column :expressionists, :global_navigation_text_outside_the_button_border, :boolean, default: false
    add_column :expressionists, :use_gables_buttons, :boolean, default: false
    add_column :expressionists, :home_page_icons_position, :string
    add_column :expressionists, :global_navigation_icons_position, :string
    add_column :expressionists, :global_navigation_show_background_color, :boolean, default: false

  end
end
