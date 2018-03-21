class Imagepage < ApplicationRecord
  belongs_to :community
  has_many :additional_images, dependent: :destroy
end
