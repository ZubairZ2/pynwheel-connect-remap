# Syncs the RENU feed's per-unit links onto every community of one company.
#
#   RenuUnitLinksSyncWorker.perform_async(company_id)
#   RenuUnitLinksSyncWorker.perform_async(company_id, "dry_run" => true)   # report only
#
# All of the work — reading the sheet, joining on provider_unit_id, deciding what
# has actually changed — lives in RenuUnitLinksSyncService. This is just the
# queue entry point, so the same logic is callable from a console or a rake task
# without a Redis round trip.
#
# queue "general" is LAST in config/sidekiq.yml's strict priority list, so a
# large backfill always yields to imports, CRM traffic and deletes.
#
# retry: 1 because the job is idempotent by construction: a re-run compares
# against what is already in the columns and writes nothing that already matches,
# so a retry after a half-finished run simply picks up the remainder.
class RenuUnitLinksSyncWorker
  include Sidekiq::Worker
  sidekiq_options queue: "general", retry: 1

  OPTIONS = %i[dry_run spreadsheet_id tab_name].freeze

  def perform(company_id, options = {})
    return if company_id.blank?

    RenuUnitLinksSyncService.new(company_id, **permitted(options)).perform
  rescue StandardError => e
    Rails.logger.error("[RenuUnitLinksSyncWorker] company=#{company_id} FAILED #{e.class}: #{e.message}")
    raise
  end

  private

  # Sidekiq hands arguments back as plain JSON, so option keys arrive as strings.
  def permitted(options)
    options.to_h.symbolize_keys.slice(*OPTIONS)
  end
end
