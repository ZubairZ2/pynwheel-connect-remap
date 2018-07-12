class FavoriteSetting < ApplicationRecord
  belongs_to :community
  has_many :favorite_images, dependent: :destroy
  has_many :ebrochure_menu_buttons, dependent: :destroy
end
