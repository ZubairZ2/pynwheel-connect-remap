class UserCustomizedTour < ApplicationRecord
  belongs_to :tour_user
  belongs_to :community
  belongs_to :tour

  validates :community_id, presence: true
  validates :tour_user_id, presence: true
  validates :tour_id, presence: true

  after_create :create_tour_stops

  private

  def create_tour_stops
    self.community.tour.tour_stops.each do |tour_stop|
      stop = tour_stop.dup
      stop.tour_id = self.tour.id
      stop.save!
    end
  end
end


