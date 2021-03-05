# == Schema Information
#
# Table name: tour_stops
#
#  id         :integer          not null, primary key
#  tour_id    :integer
#  latitude   :decimal(, )
#  longitude  :decimal(, )
#  stop_id    :integer
#  stop_type  :string
#  sort       :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  name       :string
#

class TourStop < ApplicationRecord
  belongs_to :tour
  include StandardUrl
  include RailsSortable::Model
  set_sortable :sort
  has_many :stop_details, dependent: :destroy
  has_many :stop_galleries, dependent: :destroy
  attr_accessor :building
  attr_accessor :floor
  attr_accessor :status

  has_one :path, as: :map_path
  has_many :path_points, through: :paths
  
  after_destroy :remove_associated_stops

  def path_data
  	self.stop_type.classify.constantize.path_data
  end

  def remove_associated_stops
    user_customized_tours = UserCustomizedTour.where(community_id: self.tour.community_id)
    user_customized_tours.each do |uct|
      if uct.tour.present?
        stop = uct.tour.tour_stops.where(stop_id: self.stop_id)
        stop.destroy_all
      end
    end
  end
end
