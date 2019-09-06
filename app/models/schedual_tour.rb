class SchedualTour < ApplicationRecord
  belongs_to :tour_user, optional: true
  belongs_to :tour, optional: true
end
