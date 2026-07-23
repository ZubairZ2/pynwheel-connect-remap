class MapPartner < ApplicationRecord
  belongs_to :community

  # NOTE: The app no longer reads from or writes to this table for authorization
  # or partner enrollment — that now lives in communities.partner_map_settings
  # (see Community::MAP_PARTNERS). The table is retained temporarily and will be
  # dropped in a later migration.

  # validates :community_id, :partner, :api_key, presence: true
  # validates :community_id, uniqueness: { scope: [:partner, :api_key], message: 'Combination of community_id, partner, and api_key must be unique' }
end
