class TourHistory < ApplicationRecord
  belongs_to :tour_user

  after_update :send_noyifications

  private
  def send_noyifications
    	
  end
end
