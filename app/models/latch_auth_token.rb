class LatchAuthToken < ApplicationRecord
  belongs_to :tour_user

  def expired?
    Time.current >= expires_at
  end
end
