# == Schema Information
#
# Table name: tours
#
#  id           :integer          not null, primary key
#  community_id :integer
#  name         :string
#  latitude     :decimal(, )
#  longitude    :decimal(, )
#  image        :string
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  x_plot       :integer          default(0)
#  y_plot       :integer          default(0)
#

class Tour < ApplicationRecord
  belongs_to :community
  belongs_to :tour_user
  has_many :tour_stops, dependent: :destroy
  has_many :chatrooms, dependent: :destroy

  has_one :path, as: :map_path
  has_one :tour_setting, dependent: :destroy
  has_one :scheduler_widget_setting, dependent: :destroy
  has_one :tour_stop, as: :stop, dependent: :destroy
  has_many :path_points, through: :path

  # has_many :remote_locks,  -> { for_starting_points }, class_name: 'RemoteLock', foreign_key: 'stop_id', dependent: :destroy  # was being handled manually
  has_many :remote_locks, as: :stop     # remove it only after confirm refactoring, as it is being used
  has_many :edgestate_locks, -> { where(dwelo_id: nil) },  class_name: 'RemoteLock', as: :stop           # only for of starting point's latch locks
  has_many :dwelo_locks, -> { where(edge_state_id: nil) },  class_name: 'RemoteLock', as: :stop          # only for of starting point's latch locks
  has_many :latch_locks, as: :stop                                         # only for of starting point's latch locks
  has_many :zerv_locks, as: :stop                                          # only for of starting point's latch locks
  has_many :latch_guests, as: :guest_of_stop, dependent: :destroy          # only for of starting point's latch locks
  has_many :zerv_guests, as: :guest_of_stop, dependent: :destroy           # only for of starting point's latch locks
  has_many :igloohome_locks, as: :stop, dependent: :destroy
  has_many :igloohome_guests, as: :guest_of_stop, dependent: :destroy
  
  after_create :define_opening_hours

  def as_json options = {}
    super(
      :only => [:id, :name, :max_self_tour_users],
      :include => {
        :community => {
          :only => [:id, :one_hour_email_text],
          :include => { 
            :plotted_units =>  { :only => [:id, :floor, :building, :x_plot, :y_plot], :methods => [:stop_description_text, :stop_directional_text, :name] },
            :plotted_amenities =>  { :only => [:id, :name, :floor, :building, :x_plot, :y_plot], :methods => [:stop_description_text, :stop_directional_text] }
          }
        },
        :tour_stops => {
          :only => [:id, :name, :stop_id, :stop_type, :display_stop, :latitude, :longitude], :methods => [:stop_description_text, :stop_directional_text]
        }
      },
    )
  end

  def unit_tour_stops
    stop_ids = self&.tour_stops.where(stop_type: "unit").pluck(:stop_id)
    Unit.where(id: stop_ids)
  end

  def amenity_tour_stops
    stop_ids = self&.tour_stops.where(stop_type: "amenity").pluck(:stop_id)
    Amenity.where(id: stop_ids)
  end

  def start_tour
    self&.community&.one_hour_email_text
  end

  def max_tour
    self&.max_self_tour_users
  end

  def start_tour_point
    self&.name
  end

  def define_opening_hours
    return if self.tour_user_id.present?

    self.community.opening_hours.create(day: "Monday", opening_time: "09:00", closing_time: "17:00")
    self.community.opening_hours.create(day: "Tuesday", opening_time: "09:00", closing_time: "17:00")
    self.community.opening_hours.create(day: "Wednesday", opening_time: "09:00", closing_time: "17:00")
    self.community.opening_hours.create(day: "Thursday", opening_time: "09:00", closing_time: "17:00")
    self.community.opening_hours.create(day: "Friday", opening_time: "09:00", closing_time: "17:00")
    self.community.opening_hours.create(day: "Saturday", opening_time: "09:00", closing_time: "17:00")

    self.community.guided_opening_hours.create(day: "Monday", opening_time: "09:00", closing_time: "17:00")
    self.community.guided_opening_hours.create(day: "Tuesday", opening_time: "09:00", closing_time: "17:00")
    self.community.guided_opening_hours.create(day: "Wednesday", opening_time: "09:00", closing_time: "17:00")
    self.community.guided_opening_hours.create(day: "Thursday", opening_time: "09:00", closing_time: "17:00")
    self.community.guided_opening_hours.create(day: "Friday", opening_time: "09:00", closing_time: "17:00")
    self.community.guided_opening_hours.create(day: "Saturday", opening_time: "09:00", closing_time: "17:00")
  end
  
end
