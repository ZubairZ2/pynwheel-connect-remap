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
  belongs_to :stop, polymorphic: true
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
    scheduled_tours = SchedualTour.where(community_id: self.tour.community_id)
    scheduled_tours.find_each do |scheduled_tour|
      if scheduled_tour.stops_list.present?
        scheduled_tour.stops_list.delete(self.id)
        scheduled_tour.save!
      end
    end
  end
end
