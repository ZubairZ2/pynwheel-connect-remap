# One Detect Hallways submission from Connect. The browser's
# `client_request_id` makes the save idempotent: a replay returns the stored
# `result` (the temp-key map and what was skipped) without applying the run
# again. The rows it created point back here through `detection_run_id`, which
# is what lets a run be undone while its proposals are still pending.
class HallwayDetectionRun < ApplicationRecord
  STATUSES = %w[applied undone].freeze
  SCOPES = %w[plate building all].freeze
  DETECTOR_SOURCES = %w[vector inferred autoconnect].freeze

  belongs_to :community
  belongs_to :parent, polymorphic: true
  has_many :hallways, foreign_key: :detection_run_id, dependent: :nullify, inverse_of: :detection_run
  has_many :hallway_edges, foreign_key: :detection_run_id, dependent: :nullify, inverse_of: :detection_run

  validates :client_request_id, presence: true, uniqueness: true, length: { maximum: 64 }
  validates :status, inclusion: { in: STATUSES }
  validates :scope, inclusion: { in: SCOPES }, allow_nil: true
  validates :detector_source, inclusion: { in: DETECTOR_SOURCES }, allow_nil: true
  validates :space, inclusion: { in: Hallway::SPACES }

  scope :on_level, ->(parent) { where(parent_type: parent.class.base_class.name, parent_id: parent.id) }

  def applied?
    status == 'applied'
  end

  def undone?
    status == 'undone'
  end
end
