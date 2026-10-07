# A physical self-tour stop the legacy tables cannot hold: an extra entry, an
# exit, a blocker, a leasing office, a restroom, mail & packages, parking
# access, a waypoint. Elevators, stairs and ramps are `elevators` rows (with
# a `kind`), the per-building entry gate a `building_starting_points` row, a
# door/gate stop a plate-attached `doors` row; units and amenities stay what
# they are. The stop belongs to one map (a Floorplate or the Sitemap) and,
# on a stacked floorplate, optionally to one of its floors.
#
# `x_plot` / `y_plot` are the marker's centre (not an icon's top-left as the
# legacy records store), in the map's floor-image pixels; nil while the stop
# waits in "To Plot". The record duck-types the legacy stop interface
# (`name`, `floor`, `building`, `x_plot`, `y_plot`, `lock_provider`,
# `access_code`, `directional_text`, `description`, the lock associations) so
# a later `tour_stops.stop_type = 'wayfinding_stop'` works with the existing
# `classify.constantize` pattern.
class WayfindingStop < ApplicationRecord
  KINDS = %w[entry exit blocker leasing restroom mail parking waypoint].freeze
  DESTINATION_KINDS = %w[leasing restroom mail parking waypoint].freeze
  GATE_KINDS = %w[entry exit].freeze
  STATUSES = %w[active archived].freeze
  SOURCES = %w[manual detected imported].freeze
  MAP_TYPES = %w[Floorplate Sitemap].freeze

  belongs_to :community
  belongs_to :map, polymorphic: true
  belongs_to :hallway, optional: true

  has_many :remote_locks, as: :stop
  has_many :edgestate_locks, -> { where(dwelo_id: nil) }, class_name: 'RemoteLock', as: :stop
  has_many :dwelo_locks, -> { where(edge_state_id: nil) }, class_name: 'RemoteLock', as: :stop
  has_many :latch_locks, as: :stop
  has_many :zerv_locks, as: :stop
  has_many :igloohome_locks, as: :stop

  has_paper_trail

  validates :kind, inclusion: { in: KINDS }
  validates :name, presence: true, length: { maximum: 120 }
  validates :note, length: { maximum: 500 }, allow_nil: true
  validates :status, inclusion: { in: STATUSES }
  validates :source, inclusion: { in: SOURCES }
  validates :space, inclusion: { in: Hallway::SPACES }
  validates :map_type, inclusion: { in: MAP_TYPES }
  validates :radius_px, numericality: { greater_than: 0 }, allow_nil: true
  validate :radius_only_for_blockers
  validate :floor_within_map
  validate :position_complete

  before_destroy :destroy_legacy_tour_stops
  after_commit :bump_wayfinding_version

  scope :active, -> { where(status: 'active') }
  scope :placed, -> { where.not(x_plot: nil).where.not(y_plot: nil) }
  scope :on_level, ->(map) { where(map_type: map.class.base_class.name, map_id: map.id) }
  scope :blockers, -> { where(kind: 'blocker') }
  scope :gates, -> { where(kind: GATE_KINDS) }

  def placed?
    x_plot.present? && y_plot.present?
  end

  def blocker?
    kind == 'blocker'
  end

  def gate?
    GATE_KINDS.include?(kind)
  end

  # The floors of its map this stop applies to; nil = every floor.
  def floors
    floor.nil? ? nil : [floor]
  end

  # Legacy stop interface.
  def directional_text
    note
  end

  def description
    note
  end

  def paths
    Path.none
  end

  private

    def radius_only_for_blockers
      errors.add(:radius_px, 'applies to blockers only') if radius_px.present? && !blocker?
    end

    def floor_within_map
      return if floor.nil? || map.nil? || !map.respond_to?(:floors) || map.try(:range).blank?

      errors.add(:floor, 'is not a floor of this floorplate') unless map.floors.include?(floor)
    rescue StandardError
      nil
    end

    def position_complete
      errors.add(:y_plot, 'is required with x_plot') if x_plot.present? ^ y_plot.present?
    end

    # No `tour_stops.stop_type = 'wayfinding_stop'` is written in phase 1; the
    # hook keeps the invariant should phase 2 enable it.
    def destroy_legacy_tour_stops
      TourStops::Remove.for_record!(self)
    end

    def bump_wayfinding_version
      Wayfinding::VersionBump.level!(map_type, map_id)
    end
end
