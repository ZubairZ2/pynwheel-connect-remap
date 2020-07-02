class IglooGuest < ApplicationRecord
  belongs_to :community
  belongs_to :tour_user
end
