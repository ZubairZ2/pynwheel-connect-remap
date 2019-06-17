class TourUser < ApplicationRecord
  has_many :visited_stops, dependent: :destroy
end
