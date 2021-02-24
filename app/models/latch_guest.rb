class LatchGuest < ApplicationRecord
    belongs_to :community
    belongs_to :tour_user
    belongs_to :guest_of_stop, polymorphic: true
end