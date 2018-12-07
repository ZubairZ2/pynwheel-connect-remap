class CreateExpressionists < ActiveRecord::Migration[5.0]
  def change
    create_table :expressionists do |t|
      t.string :home_page_menu_position
      t.string :home_page_position_of_logo
      t.string :home_page_logo_size
      t.string :home_page_button_border_color
      t.boolean :display_home_page_button_icon,default: true
      t.string :home_page_button_font_family
      t.string :home_page_button_font_size
      t.boolean :display_home_page_nav_background,default: true
      t.string :home_page_button_image
      t.boolean :display_global_navigation_button_border_color,default: true
      t.string :global_navigation_button_font_family
      t.string :global_navigation_button_font_size
      t.boolean :display_global_navigation_button_bg_color
      t.string :filter_panel_button_border_color
      t.string :filter_panel_text_font_size
      t.string :filter_panel_button_text_font_size
      t.integer :design_id
      
      t.timestamps
    end
  end
end
