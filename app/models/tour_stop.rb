class TourStop < ApplicationRecord
  belongs_to :tour
  include StandardUrl
  include RailsSortable::Model
  set_sortable :sort
  has_many :stop_details
  has_many :stop_galleries
end
