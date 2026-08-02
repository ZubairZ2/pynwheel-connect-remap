# One row per write this tool makes to a map file — a Floorplate/Sitemap's
# svg_image, or a Beans property's shared Community#background_svg_image. The
# target is polymorphic and always addressed through SvgOptimizableMap.
# Model rules (see SvgOptimizationWorker for the pipeline):
#   * Optimize backs up the TRUE ORIGINAL (backup_url) and records the
#     original→optimized size win (original_bytes, optimized_bytes,
#     reduction_pct). Re-optimizing a map reuses an existing matching backup.
#   * Revert restores that original from the optimize run's backup_url and
#     creates NO backup of its own — backups only ever hold originals, and the
#     optimized file is always re-derivable from the original.
#   * A map is optimizable only while it's on its original/fresh file and
#     revertable only while its live file is still the optimized output; both
#     are decided by SvgOptimizerController#optimized_now?, which compares the
#     live optimizable_svg.url to a run's resulting_url (so reverts and fresh CMS
#     re-uploads are detected). This model just records runs; the current-state
#     logic lives in the controller.
class SvgOptimizationRun < ApplicationRecord
  belongs_to :community
  belongs_to :target, polymorphic: true
  belongs_to :reverts_run, class_name: "SvgOptimizationRun", optional: true
  belongs_to :triggered_by, class_name: "User", foreign_key: :triggered_by_user_id, optional: true

  ACTIONS = %w[optimize revert].freeze
  # queued -> running -> verified -> uploaded  (a write happened)
  #                             \-> skipped     (nothing worth changing; no write)
  #                              -> failed      (aborted; live file untouched)
  STATUSES = %w[queued running verified uploaded skipped failed].freeze
  IN_PROGRESS_STATUSES = %w[queued running verified].freeze

  validates :action, inclusion: { in: ACTIONS }
  validates :status, inclusion: { in: STATUSES }

  scope :for_community, ->(community) { where(community: community) }

  # Most recent run per distinct target — the current known state of each
  # floorplate/sitemap's optimization pipeline.
  def self.latest_per_target(scope = all)
    ids = scope
      .select("DISTINCT ON (target_type, target_id) id")
      .order(:target_type, :target_id, created_at: :desc)
      .map(&:id)
    where(id: ids)
  end

  def in_progress?
    IN_PROGRESS_STATUSES.include?(status)
  end

  def failed?
    status == "failed"
  end
end
