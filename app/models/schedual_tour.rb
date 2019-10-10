class SchedualTour < ApplicationRecord
  belongs_to :tour_user, optional: true
  belongs_to :tour, optional: true
  belongs_to :community, optional: true
end
