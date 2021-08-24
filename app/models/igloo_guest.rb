class IglooGuest < ApplicationRecord
  belongs_to :community
  belongs_to :tour_user
  belongs_to :pynwheel_access_user
end
