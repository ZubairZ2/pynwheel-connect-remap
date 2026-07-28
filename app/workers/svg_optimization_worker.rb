# Runs the actual production write for one SvgOptimizationRun (one Floorplate
# or Sitemap svg_image). The web thread never does any of this — the
# controller only creates a `queued` row and enqueues this job.
#
# The ordering below IS the safety design: each numbered step is a hard gate
# the next one depends on. The single invariant everything protects is:
#
#   the live file is NEVER overwritten until a byte-verified backup of
#   whatever was live exists first.
#
# retry: 0 — a failure never silently re-runs against state a previous
# attempt may have partially mutated. A human re-triggers, which creates a
# fresh row rather than mutating this one. See docs/svg_optimizer_plan.md §3.3.
# Isolation from other background jobs (deliberate):
#   * queue "general" is LAST in config/sidekiq.yml's strict priority list, so
#     these jobs always yield to every other queue (imports, CRM, deletes, …)
#     and can never starve them.
#   * retry: 0 — a failure never re-runs, so it can't pile up or loop.
#   * The only DB write is `target.save!`. Floorplate's sole commit callback
#     (populate_image_urls) fires only when the legacy raster `image` is
#     present and uses update_column, which bypasses callbacks — so it can't
#     recurse or enqueue anything. Sitemap has no commit callbacks. Nothing
#     here fans out into other jobs.
class SvgOptimizationWorker
  include Sidekiq::Worker
  include SvgStorageReader
  sidekiq_options queue: "general", retry: 0

  # Matches any inline base64 raster payload so we can blank it out for the
  # structural-equality check without caring what image bytes are on either
  # side — only the SVG *around* the images must be identical.
  IMAGE_DATA_RE = %r{data:image/[a-zA-Z0-9.+-]+;base64,[^"']*}.freeze

  def perform(run_id)
    @run = SvgOptimizationRun.find(run_id)
    return unless @run.status == "queued" # ignore double-enqueue / already-started

    @run.update!(status: "running", started_at: Time.current, error_message: nil)
    target = @run.target

    # 1. Fetch what's live right now.
    original_bytes = read_uploader(target.svg_image)
    raise "Live svg_image has no readable content." if original_bytes.blank?

    # 2. Optimistic concurrency baseline — anything else touching this record
    #    (e.g. a manual CMS re-upload) between now and the write aborts us.
    baseline_updated_at = target.updated_at

    # 3. Compute the new content for whichever action this run is.
    candidate_bytes = compute_candidate(original_bytes)
    return if @run.status == "skipped" # optimize found nothing to do — stop.

    # 4. Structural verification (optimize only): everything outside the
    #    embedded image data must be byte-identical.
    if @run.action == "optimize"
      verify_structure!(original_bytes, candidate_bytes)
    end

    # 5. Backups only ever hold the TRUE ORIGINAL. Because optimize runs once
    #    per map (enforced at the controller), the live file here IS the
    #    original — back it up, then re-fetch and confirm it landed BEFORE we
    #    let CarrierWave delete the live file. Revert restores that original
    #    and creates no backup of its own (the optimized file is derivable).
    if @run.action == "optimize"
      backup_url = backup_and_confirm!(original_bytes)
      @run.update!(
        backup_url: backup_url,
        original_bytes: original_bytes.bytesize,
        optimized_bytes: candidate_bytes.bytesize,
        reduction_pct: reduction_pct(original_bytes, candidate_bytes),
        status: "verified"
      )
    else
      @run.update!(
        original_bytes: original_bytes.bytesize,
        optimized_bytes: candidate_bytes.bytesize,
        status: "verified"
      )
    end

    # 6. Re-check the concurrency guard one last time, immediately before write.
    target.reload
    if target.updated_at != baseline_updated_at
      raise "Target was modified by something else during this run (updated_at changed) — aborting to avoid clobbering it."
    end

    # 7. Write through the model's normal CarrierWave path — the same
    #    mechanism a manual CMS re-upload uses. CarrierWave deletes the
    #    previous live file once the new one stores, which is exactly why
    #    step 5 had to succeed first.
    target.svg_image = wrap_upload(candidate_bytes)
    target.save!

    # 8. Done.
    @run.update!(
      status: "uploaded",
      resulting_url: target.svg_image.url,
      finished_at: Time.current
    )
  rescue StandardError => e
    fail_run!(e)
    raise # let Sidekiq record it; retry: 0 means no re-run
  end

  private

  # ---- step 3 ----------------------------------------------------------------

  def compute_candidate(original_bytes)
    case @run.action
    when "optimize"
      result = SvgBackgroundOptimizerService.call(original_bytes.dup)
      optimized = result[:images].select { |i| i[:action] == "optimized" }
      if optimized.empty? || result[:optimized_svg] == original_bytes
        @run.update!(
          status: "skipped",
          original_bytes: original_bytes.bytesize,
          optimized_bytes: original_bytes.bytesize,
          reduction_pct: 0,
          finished_at: Time.current
        )
        return nil
      end
      result[:optimized_svg]
    when "revert"
      source = @run.reverts_run
      raise "Revert run is missing its reverts_run reference." unless source
      raise "The run being reverted has no backup_url to restore from." if source.backup_url.blank?

      bytes = read_url(source.backup_url)
      raise "Backup to restore was unreachable or empty (#{source.backup_url})." if bytes.blank?
      bytes
    else
      raise "Unknown action: #{@run.action.inspect}"
    end
  end

  # ---- step 4 ----------------------------------------------------------------

  def verify_structure!(original_bytes, candidate_bytes)
    stripped_original  = original_bytes.gsub(IMAGE_DATA_RE, "data:__stripped__")
    stripped_candidate = candidate_bytes.gsub(IMAGE_DATA_RE, "data:__stripped__")
    unless stripped_original == stripped_candidate
      raise "Structural verification failed: the optimized SVG differs outside the embedded image data. Refusing to write."
    end
  end

  # ---- step 5 ----------------------------------------------------------------

  def backup_and_confirm!(original_bytes)
    # Reuse an existing backup only if it byte-matches THIS original. A map
    # optimized → reverted → re-optimized already has its original stored, so
    # we skip a duplicate upload. But if the live original differs (a fresh CMS
    # re-upload changed the file), no prior backup will match and we store the
    # new original — so the backup always holds the true current original.
    existing = existing_matching_backup(original_bytes)
    return existing if existing

    key = backup_key
    uploader = SvgBackupUploader.new
    uploader.community_id = @run.community_id
    uploader.backup_key = key
    uploader.store!(wrap_upload(original_bytes, filename: File.basename(key)))

    confirmed = read_url(uploader.url)
    if confirmed.blank? || confirmed.bytesize != original_bytes.bytesize
      raise "Backup did not land verifiably (expected #{original_bytes.bytesize} bytes, re-fetched #{confirmed&.bytesize.inspect}). Refusing to overwrite the live file."
    end
    uploader.url
  end

  # Returns the backup_url of a prior optimize run for this same target whose
  # stored backup byte-matches `original_bytes`, or nil if none matches.
  def existing_matching_backup(original_bytes)
    SvgOptimizationRun
      .where(community_id: @run.community_id, target_type: @run.target_type, target_id: @run.target_id, action: "optimize")
      .where.not(id: @run.id)
      .where.not(backup_url: nil)
      .order(created_at: :desc)
      .each do |run|
        bytes = read_url(run.backup_url)
        return run.backup_url if bytes.present? && bytes.bytesize == original_bytes.bytesize && bytes == original_bytes
      end
    nil
  end

  def backup_key
    ts = Time.current.strftime("%Y%m%d%H%M%S")
    "#{@run.target_type}/#{@run.target_id}/#{@run.id}-#{ts}-original.svg"
  end

  # ---- helpers ---------------------------------------------------------------
  # read_uploader / read_url come from SvgStorageReader (shared with the
  # controller's in-memory analyze/preview path).

  def reduction_pct(original_bytes, candidate_bytes)
    return 0 if original_bytes.bytesize.zero?
    ((1 - (candidate_bytes.bytesize.to_f / original_bytes.bytesize)) * 100).round(1)
  end

  def fail_run!(error)
    @run&.update_columns(
      status: "failed",
      error_message: "#{error.class}: #{error.message}",
      finished_at: Time.current,
      updated_at: Time.current
    )
    Rails.logger.error("[SvgOptimizationWorker] run=#{@run&.id} failed: #{error.class}: #{error.message}")
  end

  # CarrierWave accepts any object that reads like an uploaded file. A StringIO
  # carrying original_filename/content_type is the minimal such wrapper, so we
  # can assign raw bytes without staging a Tempfile.
  def wrap_upload(bytes, filename: "optimized.svg")
    UploadedBytes.new(bytes, filename)
  end

  class UploadedBytes < StringIO
    attr_reader :original_filename, :content_type

    def initialize(bytes, filename)
      super(bytes.dup.force_encoding("BINARY"))
      @original_filename = filename
      @content_type = "image/svg+xml"
    end
  end
end
