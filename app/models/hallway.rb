# A node of the pathway graph a self-guided tour is routed over. `x_plot` /
# `y_plot` are the icon's top-left in the floor image's pixels (the legacy
# convention; both editors draw the centre 8px further), `next_points` the ids
# this node links to (stored one way, walked both ways by every reader), and
# `selected` the node the legacy editor chains the next click from.
#
# The wayfinding columns added in October 2026 (`source`, `review_status`,
# `confidence`, `space`, `community_id`, `detection_run_id`, `confirmed_at`,
# `created_by_user_id`) default to a hand-drawn, confirmed, floor-image-pixel
# node, which is what every row created by `HallwaysController` is. Only the
# Connect graph save (`Wayfinding::GraphSave`) writes other values.
#
# Routability: the routing engine (`ShortestPath`) and the legacy map pages
# read `Hallway.routable` - confirmed nodes drawn in the floor image's frame.
# A node detected from the floor SVG (`space: 'svg'`) or still pending review
# is kept out of both until it is confirmed and, for SVG rows, reprojected.
class Hallway < ApplicationRecord
  SOURCES = %w[manual vector inferred].freeze
  REVIEW_STATUSES = %w[pending confirmed].freeze
  SPACES = %w[raster svg].freeze

  belongs_to :parent, polymorphic: true
  belongs_to :detection_run, class_name: 'HallwayDetectionRun', optional: true
  has_many :edges_from, class_name: 'HallwayEdge', foreign_key: :from_hallway_id, dependent: :delete_all, inverse_of: :from_hallway
  has_many :edges_to, class_name: 'HallwayEdge', foreign_key: :to_hallway_id, dependent: :delete_all, inverse_of: :to_hallway
  has_many :attachments, class_name: 'HallwayAttachment', dependent: :delete_all

  has_paper_trail

  validates :source, inclusion: { in: SOURCES }
  validates :review_status, inclusion: { in: REVIEW_STATUSES }
  validates :space, inclusion: { in: SPACES }

  before_validation :inherit_community_id
  after_save :prune_edge_rows_for_removed_links, if: :saved_change_to_next_points?
  after_commit :bump_parent_wayfinding_version

  scope :routable, -> { where(review_status: 'confirmed', space: 'raster') }
  scope :pending, -> { where(review_status: 'pending') }
  scope :confirmed, -> { where(review_status: 'confirmed') }
  scope :on_level, ->(parent) { where(parent_type: parent.class.base_class.name, parent_id: parent.id) }

  def pending?
    review_status == 'pending'
  end

  def confirmed?
    review_status == 'confirmed'
  end

  def raster?
    space == 'raster'
  end

  def routable?
    confirmed? && raster?
  end

  # Whether this node links to `other` on either side (the adjacency is stored
  # one way) or an edge row exists for the pair.
  def linked_to?(other)
    other_id = other.is_a?(Hallway) ? other.id : other.to_i
    Array(next_points).include?(other_id) ||
      Array(other.is_a?(Hallway) ? other.next_points : Hallway.where(id: other_id).pick(:next_points)).include?(id) ||
      HallwayEdge.for_pair(id, other_id).exists?
  end

  def delete_hallway_point(hallways)
    linked_hallways = hallways.where(id: self.next_points)
    linked_by_hallways = hallways.where("#{self.id} = ANY(next_points)") # previous hallways
    if linked_hallways.count == 0 && linked_by_hallways.count == 0 # for solo hallway point like me
      self.destroy
      hallway = hallways.last; hallway.selected = true; hallway.save
    elsif linked_by_hallways.count == 0 && linked_hallways.count > 0 # for first point (point which have no parent)
      linked_hallways.each {|hallway| hallway.next_points = (hallway.next_points - [self.id]).uniq; hallway.save }
      self.destroy
      hallway = linked_hallways.first; hallway.selected = true; hallway.save
    elsif linked_hallways.count == 0  # For leaf point
      linked_by_hallways.each {|hallway| hallway.next_points = (hallway.next_points - [self.id]).uniq; hallway.save }
      self.destroy
      hallway = linked_by_hallways.last; hallway.selected = true; hallway.save
    elsif linked_hallways.count <= 1 && linked_by_hallways.count <= 2 || linked_hallways.count <= 2 && linked_by_hallways.count <= 1 # For middle point and possible to delete
      if linked_hallways.count == 1 && linked_by_hallways.count == 1
        prev_point = linked_by_hallways.first
        next_point = linked_hallways.first
        prev_point.next_points = (prev_point.next_points - [self.id]).uniq
        prev_point.next_points = (prev_point.next_points + [next_point.id]).uniq
        prev_point.save
        self.destroy
        hallway = linked_hallways.last; hallway.selected = true; hallway.save
      elsif linked_hallways.count == 1 && linked_by_hallways.count == 2 # previous are two and next is only one  from middle a,b => middle => c
        linked_by_hallways.each do |hallway|
          hallway.next_points = (hallway.next_points - [self.id]).uniq
          hallway.next_points = (hallway.next_points + [linked_hallways.first.id]).uniq
          hallway.save
        end
        self.destroy
        hallway = linked_hallways.last; hallway.selected = true; hallway.save
      elsif linked_hallways.count == 2 && linked_by_hallways.count == 1 # next are two and previous is only one  from middle c => middle => a,b
        hallway = linked_by_hallways.first
        hallway.next_points = (hallway.next_points - [self.id]).uniq
        hallway.next_points = (hallway.next_points + linked_hallways.pluck(:id)).uniq
        hallway.save
        self.destroy
        hallway = linked_hallways.last; hallway.selected = true; hallway.save
      end
    else
      linked_by_hallways.each {|hallway| hallway.next_points = (hallway.next_points - [self.id]).uniq; hallway.save }
      self.destroy
      hallway = linked_by_hallways.last; hallway.selected = true; hallway.save
    end
  end

  private

    def inherit_community_id
      return if community_id.present? || parent_type.blank? || parent_id.blank?

      klass = parent_type.safe_constantize
      self.community_id = klass.where(id: parent_id).pick(:community_id) if klass.respond_to?(:where)
    end

    # The legacy editor rewires `next_points` directly (`delete_hallway_point`,
    # `connect_leaf_point`). When it drops an adjacency, the edge row that
    # decorated it must go too, or the row would describe a link that no
    # reader walks. One DELETE per dropped id; never runs the other way, so
    # it cannot loop.
    def prune_edge_rows_for_removed_links
      before, after = saved_change_to_next_points
      removed = Array(before) - Array(after)
      return if removed.empty?

      removed.each do |other_id|
        next if Hallway.where(id: other_id).where('? = ANY(next_points)', id).exists?

        HallwayEdge.for_pair(id, other_id).delete_all
      end
    rescue StandardError => e
      Rails.logger.warn("[Wayfinding] edge prune skipped for hallway #{id}: #{e.class}: #{e.message}")
    end

    # Every change to a node (from either editor) moves the level's version,
    # so a Connect save started before it fails its compare-and-swap instead
    # of overwriting it.
    def bump_parent_wayfinding_version
      Wayfinding::VersionBump.level!(parent_type, parent_id)
    end
end
