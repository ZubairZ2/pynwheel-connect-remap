# Where a stop joins the pathway graph on one level. Without a row the stop
# attaches to its nearest routable hallway node (the legacy `ShortestPath`
# rule, which stays the default); an `explicit` row names the node chosen in
# Connect; a `detached` row says the stop joins nothing until it is linked
# again. `anchor_x` / `anchor_y` keep a join point given by hand to a record
# that has no position in the level's frame.
class HallwayAttachment < ApplicationRecord
  MODES = %w[explicit detached].freeze
  ATTACHABLE_TYPES = %w[Unit Amenity Door Elevator BuildingStartingPoint Tour WayfindingStop].freeze

  belongs_to :attachable, polymorphic: true
  belongs_to :parent, polymorphic: true
  belongs_to :hallway, optional: true

  has_paper_trail

  validates :mode, inclusion: { in: MODES }
  validates :attachable_type, inclusion: { in: ATTACHABLE_TYPES }
  validates :space, inclusion: { in: Hallway::SPACES }
  validate :mode_consistency

  scope :on_level, ->(parent) { where(parent_type: parent.class.base_class.name, parent_id: parent.id) }
  scope :explicit, -> { where(mode: 'explicit') }
  scope :detached, -> { where(mode: 'detached') }

  def explicit?
    mode == 'explicit'
  end

  def detached?
    mode == 'detached'
  end

  def anchor
    return nil if anchor_x.nil? || anchor_y.nil?

    [anchor_x.to_f, anchor_y.to_f]
  end

  private

    def mode_consistency
      if explicit? && hallway_id.blank?
        errors.add(:hallway_id, 'is required for an explicit link')
      elsif detached? && hallway_id.present?
        errors.add(:hallway_id, 'must be empty for a detached stop')
      end
    end
end
