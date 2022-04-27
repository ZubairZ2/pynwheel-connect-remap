class PortalTourStop < ApplicationRecord
  belongs_to :portal_tour
  has_one :status, as: :statusable
  has_many :portal_tour_stop_galleries
end
