class MapPartner < ApplicationRecord
  belongs_to :community

  # validates :community_id, :partner, :api_key, presence: true
  # validates :community_id, uniqueness: { scope: [:partner, :api_key], message: 'Combination of community_id, partner, and api_key must be unique' }
end