class BedroomMarkerColor < ApplicationRecord
  belongs_to :community

  validates :bedroom, uniqueness: { scope: :community_id }
end
