class AddHomePageNavigationBackgroundColorToDesigns < ActiveRecord::Migration[5.0]
  def change
    add_column :designs, :home_page_navigation_background_color, :string
  end
end
