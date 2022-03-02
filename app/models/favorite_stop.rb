class FavoriteStop < ApplicationRecord
  belongs_to :community

  def favorite_units tour_user
    (self.present? ? self.favorite_unit : []) + (self.user_favorites_unit[(tour_user.present? ? tour_user.email : nil)].present? ? self.user_favorites_unit[tour_user.email] : [])
  end

  def favorite_amenities tour_user
    (self.user_favorites_amenity[(tour_user.present? ? tour_user.email : nil)].present? ? self.user_favorites_amenity[tour_user.email] : [])
  end

end
