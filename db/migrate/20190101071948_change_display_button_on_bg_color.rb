class ChangeDisplayButtonOnBgColor < ActiveRecord::Migration[5.0]
  def change
    change_column :expressionists, :display_button_on_bg_color, :boolean, :default => false
    change_column :expressionists, :global_navigation_show_background_color, :boolean, :default => true
    change_column :expressionists, :global_navigation_icons_position, :string, :default => "Above the text"
    
  end
end
