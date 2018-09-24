class AddFieldsDisplayGlobalNavBackgroundImageToExpressionists < ActiveRecord::Migration[5.0]
  def change
    add_column :expressionists, :display_global_nav_background_image, :boolean, default: false
    add_column :expressionists, :global_nav_background_image, :string

    add_column :expressionists, :home_page_background_image, :string
  end
end
