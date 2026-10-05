# A tombstone for a hallway node or edge the user deleted in Connect. Detect
# Hallways skips a proposal whose geometry matches one, so a path the user
# removed does not come back merely because the detector still sees it.
# A hand re-creation at the same place deletes the tombstone again.
class HallwaySuppression < ApplicationRecord
  KINDS = %w[node edge].freeze

  belongs_to :parent, polymorphic: true

  validates :kind, inclusion: { in: KINDS }
  validates :space, inclusion: { in: Hallway::SPACES }
  validates :x1, :y1, presence: true
  validates :x2, :y2, presence: true, if: -> { kind == 'edge' }

  scope :on_level, ->(parent) { where(parent_type: parent.class.base_class.name, parent_id: parent.id) }
  scope :nodes, -> { where(kind: 'node') }
  scope :edges, -> { where(kind: 'edge') }

  def node?
    kind == 'node'
  end

  def edge?
    kind == 'edge'
  end
end
