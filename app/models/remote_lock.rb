class RemoteLock < ApplicationRecord
  belongs_to :unit
  belongs_to :amenity
  belongs_to :edge_state
end
