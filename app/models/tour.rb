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
