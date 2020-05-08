class AddUserFavoritesUnitFieldToFavoriteStops < ActiveRecord::Migration[5.0]
  def change
    add_column :favorite_stops, :user_favorites_unit, :json, default: {}
    add_column :favorite_stops, :user_favorites_amenity, :json, default: {}
  end
end
