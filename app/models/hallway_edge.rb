# One edge of the pathway graph, keyed by its canonical node pair
# (`from_hallway_id < to_hallway_id`). The adjacency the legacy readers walk
# stays in `hallways.next_points`; this row carries what an adjacency cannot
# hold - a polyline, a kind, a review state, the detection run - and exists
# only for edges that need it. A `confirmed` row is mirrored into `next_points`
# on exactly one side by `Wayfinding::GraphSave`; a `pending` row never is.
class HallwayEdge < ApplicationRecord
  KINDS = %w[manual traced inferred bridge knn].freeze
  REVIEW_STATUSES = Hallway::REVIEW_STATUSES
  SPACES = Hallway::SPACES
  MAX_POINTS = 500

  belongs_to :from_hallway, class_name: 'Hallway', inverse_of: :edges_from
  belongs_to :to_hallway, class_name: 'Hallway', inverse_of: :edges_to
  belongs_to :parent, polymorphic: true
  belongs_to :detection_run, class_name: 'HallwayDetectionRun', optional: true

  has_paper_trail

  validates :kind, inclusion: { in: KINDS }
  validates :review_status, inclusion: { in: REVIEW_STATUSES }
  validates :space, inclusion: { in: SPACES }
  validate :canonical_pair
  validate :path_points_shape

  scope :confirmed, -> { where(review_status: 'confirmed') }
  scope :pending, -> { where(review_status: 'pending') }
  scope :on_level, ->(parent) { where(parent_type: parent.class.base_class.name, parent_id: parent.id) }
  scope :for_pair, lambda { |a, b|
    x, y = [a.to_i, b.to_i].minmax
    where(from_hallway_id: x, to_hallway_id: y)
  }
  scope :touching, ->(hallway_id) { where('from_hallway_id = :id OR to_hallway_id = :id', id: hallway_id) }

  def self.canonical(a, b)
    [a.to_i, b.to_i].minmax
  end

  # Builds the row for two nodes in canonical order, whichever is given first.
  def self.between!(a, b, **attrs)
    lo, hi = [a, b].sort_by(&:id)
    create!(attrs.merge(from_hallway: lo, to_hallway: hi, parent: lo.parent, community_id: lo.community_id))
  end

  def pair
    [from_hallway_id, to_hallway_id]
  end

  def pending?
    review_status == 'pending'
  end

  def confirmed?
    review_status == 'confirmed'
  end

  # The interior polyline as seen from `from_id` towards the other end.
  def points_from(from_id)
    points = Array(path_points).map { |p| [p[0].to_f, p[1].to_f] }
    from_id.to_i == from_hallway_id ? points : points.reverse
  end

  private

    def canonical_pair
      return if from_hallway_id.blank? || to_hallway_id.blank?

      errors.add(:base, 'An edge cannot join a node to itself') if from_hallway_id == to_hallway_id
      errors.add(:base, 'Edge nodes must be stored in canonical order') if from_hallway_id > to_hallway_id
    end

    def path_points_shape
      points = path_points
      unless points.is_a?(Array) && points.size <= MAX_POINTS
        errors.add(:path_points, "must be an array of at most #{MAX_POINTS} points")
        return
      end
      bad = points.any? do |p|
        !(p.is_a?(Array) && p.size == 2 && p.all? { |v| v.is_a?(Numeric) && v.to_f.finite? })
      end
      errors.add(:path_points, 'must hold [x, y] pairs of finite numbers') if bad
    end
end
