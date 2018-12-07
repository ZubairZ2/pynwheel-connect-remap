class AddColumnShowHideToFavoriteSettings < ActiveRecord::Migration[5.0]
  def change
    add_column :favorite_settings, :show_favorite, :boolean, default: true
    add_column :favorite_settings, :favorite_name, :string, default: "Favorite"
  end
end
