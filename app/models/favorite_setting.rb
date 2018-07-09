class FavoriteSetting < ApplicationRecord
  belongs_to :community
  has_many :favorite_images, dependent: :destroy
end
