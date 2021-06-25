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

  scope :visible, -> { where(display_stop: true) }

  def path_data
  	self.stop_type.classify.constantize.path_data
  end
end
