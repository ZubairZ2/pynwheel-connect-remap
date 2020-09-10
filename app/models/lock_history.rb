class LockHistory < ApplicationRecord
  belongs_to :tour_user
  belongs_to :tour_history
end
