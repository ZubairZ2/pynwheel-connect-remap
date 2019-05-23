class Tour < ApplicationRecord
  belongs_to :community
  has_many :tour_stops, dependent: :destroy
end
