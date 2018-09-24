class AddDisplayHomePageNavBackgroundImageFieldToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :display_home_page_nav_background_image, :boolean, default: false
  end
end
