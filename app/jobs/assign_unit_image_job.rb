class AssignUnitImageJob < ApplicationJob
  # `default` is NOT in config/sidekiq.yml's queue list, so jobs there are never
  # picked up. Use the RentCafe import queue that the worker actually processes.
  queue_as :yardi_rent_cafe

  # Downloads and stores a single unit's image out-of-band so the RentCafe sync
  # thread isn't blocked on per-unit HTTP download + RMagick + S3 upload.
  # Enqueued (in parallel) by DataImportService#assign_unit_images.
  def perform(unit_id, image_url)
    return if unit_id.blank? || image_url.blank?

    unit = Unit.find_by(id: unit_id)
    return if unit.nil?
    # Re-check under the job in case state changed between enqueue and run.
    return if unit.manual_override || unit.image.present?

    unit.remote_image_url = image_url
    unit.save(validate: false)
  rescue => exception
    Rails.logger.error("AssignUnitImageJob failed for unit #{unit_id}: #{exception.message}")
  end
end
