class SchedualTour < ApplicationRecord
  belongs_to :tour_user
  belongs_to :tour
end
