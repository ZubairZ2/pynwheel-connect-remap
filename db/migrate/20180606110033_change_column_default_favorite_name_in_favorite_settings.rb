class ChangeColumnDefaultFavoriteNameInFavoriteSettings < ActiveRecord::Migration[5.0]
  def change
  	change_column_default(:favorite_settings, :favorite_name, 'Favorites')
  end
end
