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
  # attr_accessor :status

  has_one :path, as: :map_path
  has_many :path_points, through: :paths
  belongs_to :unit, dependent: :destroy
  has_one :status, as: :statusable
  
  before_destroy :remove_associated_stops

  scope :visible, -> { where(display_stop: true) }

  scope :visible, -> { where(display_stop: true) }

  def check_unit_occupied
    if self.stop_type == "unit"
      u = Unit.find self.stop_id
      return (u.available || u.modal_unit) ? false : true
    else
      return false
    end
  end

  def get_unit_navigation_title navigation_title
    navigation_title = navigation_title.split(":")
    "#{navigation_title[0]}: Apt ##{navigation_title[1]}"
  end

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

  def fetch_lock_stop_provider
    stop_lock_provider = ""
    actual_stop = (self.stop_type.classify.constantize.find_by_id self.stop_id)
    have_door = (actual_stop.class.name == "Unit" &&  actual_stop.door.present?) || (actual_stop.class.name == "Amenity" &&  actual_stop.doors.any?)
    if have_door
      if actual_stop.class.name == "Unit"
        stop_lock_provider = actual_stop.door.lock_provider
      elsif actual_stop.class.name == "Amenity"
        stop_lock_provider = actual_stop.doors.first.lock_provider
      end
    else
      stop_lock_provider = actual_stop.lock_provider
    end
    stop_lock_provider
  end

  def get_latitude
    actual_stop = self.stop_type.classify.constantize.find self.stop_id
    actual_stop.x_plot
  end
  
  def get_longitude
    actual_stop = self.stop_type.classify.constantize.find self.stop_id
    actual_stop.y_plot
  end

end
