class RemoteLock < ApplicationRecord
  belongs_to :unit
  belongs_to :amenity
  belongs_to :edge_state

  scope :for_units, -> { where stop_type: "unit"}
  scope :for_amenties, -> { where stop_type: "amenity"}
end
