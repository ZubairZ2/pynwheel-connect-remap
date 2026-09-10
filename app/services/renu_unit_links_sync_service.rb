# Pushes the two per-unit links RENU maintains in their "Pynwheel - RENU Property
# Data Feed" sheet onto our units, for every community under one company.
#
#   RenuUnitLinksSyncService.new(company_id).perform
#
# Mapping — sheet column -> unit column (see LINKS):
#
#   "Boom Application URL" -> virtual_tour_url  (+ label "Apply Now",       open in new tab)
#   "Rently Listing URL"   -> scheduler_url     (+ label "Schedule a Tour", open in new tab)
#
# A link RENU feeds us always points off-site, so whenever a URL is synced its
# label and its link{1,3}_open_new_tab flag are brought along with it.
#
# The join is the sheet's "AF Unit Integration ID" against units.provider_unit_id,
# compared case-insensitively and whitespace-trimmed. Anything that does not join
# is skipped and counted; nothing is created, nothing is deleted.
#
# Why it is shaped like this:
#
#   * ONE read of the sheet, then ONE index scan over the company's units. Rows
#     are batched through in_batches/pluck, so a company with 100k units never
#     holds more than a batch of tuples in memory and no ActiveRecord objects
#     are instantiated at all.
#   * A unit is written ONLY when a value actually differs from what is already
#     in the column. Re-running the job right after a run touches zero rows —
#     that is the "no duplicate updates" guarantee, and it also means a blank
#     cell in the sheet never wipes a link a human typed in the CMS.
#   * Writes go out as one `UPDATE … FROM (VALUES …)` per 500 units rather than
#     500 individual UPDATEs. That deliberately bypasses Unit's callbacks: the
#     ones on this model are image-cropping and door-replotting hooks
#     (remove_doors_plotting fires on *any* update of an unplotted unit), and a
#     link sync has no business triggering them. updated_at is still bumped so
#     anything cached off it re-renders.
class RenuUnitLinksSyncService
  class Error < StandardError; end

  # RENU's own "Pynwheel - RENU Property Data Feed" — the live source, so a
  # scheduled run genuinely picks up their edits. It is link-shared ("anyone with
  # the link can view"), which is what lets the reader take its no-credentials CSV
  # path; GOOGLE_SERVICE_ACCOUNT_JSON is NOT required while that holds. We are
  # only viewers on this document and cannot manage its access, so if the owner
  # ever sets it back to Restricted every run fails with a 401 until a service
  # account is created and they share the sheet with it.
  SPREADSHEET_ID = "1BhPQM4HZjrG27prhWWGxc5OhO607l8MquV30rrJIeFY".freeze
  TAB_NAME       = "Data Feed".freeze

  # The sheet column holding the id we join on.
  KEY_COLUMN = "af_unit_integration_id".freeze

  # Each entry carries everything one link owns: the URL column, the caption
  # column and its text, and the "open in a new tab" flag that belongs to that
  # same button — link1 is the virtual-tour button, link3 the scheduler one.
  # Declaration order is also the column order used to bucket writes, so the
  # generated SQL is stable and easy to read in a log.
  LINKS = {
    "boom_application_url" => { url: :virtual_tour_url, label: :virtual_tour_button_label, label_text: "Apply Now",       new_tab: :link1_open_new_tab },
    "rently_listing_url"   => { url: :scheduler_url,    label: :scheduler_label,           label_text: "Schedule a Tour", new_tab: :link3_open_new_tab }
  }.freeze

  UNIT_COLUMNS = ([:id, :provider_unit_id] + LINKS.values.flat_map { |m| [m[:url], m[:label], m[:new_tab]] }).freeze

  READ_BATCH  = 2_000
  WRITE_BATCH = 500

  attr_reader :stats

  # company_id     — the only required input; every community under it is synced.
  # dry_run        — compute and report the diff without writing a single row.
  # spreadsheet_id / tab_name — overridable so the same service can drive a
  #                  different feed (a test copy, next year's sheet) unchanged.
  def initialize(company_id, dry_run: false, spreadsheet_id: SPREADSHEET_ID, tab_name: TAB_NAME)
    @company_id     = company_id
    @dry_run        = dry_run
    @spreadsheet_id = spreadsheet_id
    @tab_name       = tab_name
    @stats = {
      communities: 0, sheet_rows: 0, sheet_keys: 0, duplicate_keys: 0,
      matched: 0, updated: 0, unchanged: 0, unmatched_keys: 0, replaced_urls: 0,
      dry_run: dry_run
    }
  end

  def perform
    company = Company.find_by(id: @company_id)
    raise Error, "no company with id=#{@company_id.inspect}" if company.nil?

    community_ids = company.communities.pluck(:id)
    @stats[:communities] = community_ids.size
    return finish("company has no communities") if community_ids.empty?

    links = load_sheet_links
    return finish("sheet has no usable rows") if links.empty?

    pending = collect_updates(community_ids, links)
    flush(pending) unless @dry_run

    finish
  end

  private

  # --- sheet -------------------------------------------------------------

  # => { "d959a7be-…" (downcased key) => { virtual_tour_url: "https://…", scheduler_url: "https://…" } }
  #
  # A key repeated in the sheet does not produce two updates: the first non-blank
  # value seen for each column wins, and later rows only fill in what is still
  # missing. That keeps the result stable no matter how the sheet is sorted.
  def load_sheet_links
    rows = GoogleSheets::Reader.new(@spreadsheet_id).rows(@tab_name)
    @stats[:sheet_rows] = rows.size

    links = {}
    rows.each do |row|
      key = row[KEY_COLUMN].to_s.strip.downcase
      next if key.blank?

      values = LINKS.each_with_object({}) do |(sheet_column, mapping), acc|
        url = row[sheet_column].presence
        acc[mapping[:url]] = url if url
      end
      next if values.empty?

      if links.key?(key)
        @stats[:duplicate_keys] += 1
        values.each { |column, value| links[key][column] ||= value }
      else
        links[key] = values
      end
    end

    @stats[:sheet_keys] = links.size
    links
  end

  # --- diff ---------------------------------------------------------------

  # Walks the company's units once and returns the writes that are actually
  # needed, bucketed by which columns they touch:
  #
  #   { [:virtual_tour_url, :virtual_tour_button_label] => [[unit_id, url, label], …], … }
  #
  # Bucketing is what lets a mixed batch still go out as a handful of set-based
  # UPDATEs: every row inside a bucket sets exactly the same column list.
  def collect_updates(community_ids, links)
    pending = Hash.new { |hash, columns| hash[columns] = [] }
    seen_keys = Set.new

    scope = Unit.where(community_id: community_ids).where.not(provider_unit_id: [nil, ""])
    scope.in_batches(of: READ_BATCH) do |batch|
      batch.pluck(*UNIT_COLUMNS).each do |row|
        current = UNIT_COLUMNS.zip(row).to_h
        wanted  = links[current[:provider_unit_id].to_s.strip.downcase]
        next if wanted.nil?

        @stats[:matched] += 1
        seen_keys << current[:provider_unit_id].to_s.strip.downcase

        changes = diff(current, wanted)
        if changes.empty?
          @stats[:unchanged] += 1
        else
          pending[changes.keys] << [current[:id], *changes.values]
        end
      end
    end

    @stats[:updated] = pending.values.sum(&:size)
    @stats[:unmatched_keys] = links.size - seen_keys.size
    pending
  end

  # The whole "skip if it already matches" rule lives here. A column is included
  # only when the sheet has a value for it AND that value differs from what the
  # unit already holds; the label and the new-tab flag ride along with their URL
  # so a link never shows up under the wrong caption or opens in place.
  def diff(current, wanted)
    LINKS.each_value.with_object({}) do |mapping, changes|
      url = wanted[mapping[:url]]
      next if url.blank?

      if current[mapping[:url]].to_s != url
        changes[mapping[:url]] = url
        @stats[:replaced_urls] += 1 if current[mapping[:url]].present?
      end
      changes[mapping[:label]] = mapping[:label_text] if current[mapping[:label]].to_s != mapping[:label_text]
      changes[mapping[:new_tab]] = true unless current[mapping[:new_tab]]
    end
  end

  # --- write --------------------------------------------------------------

  def flush(pending)
    pending.each do |columns, rows|
      rows.each_slice(WRITE_BATCH) { |slice| write_slice(columns, slice) }
    end
  end

  # One statement per slice:
  #
  #   UPDATE units AS u
  #      SET "virtual_tour_url" = v."virtual_tour_url", …, "updated_at" = CURRENT_TIMESTAMP
  #     FROM (VALUES (12::integer, 'https://…'::character varying, TRUE::boolean, …), …)
  #            AS v("id", "virtual_tour_url", "link1_open_new_tab", …)
  #    WHERE u."id" = v."id"
  #
  # Every literal is cast because Postgres infers a VALUES list's column types
  # from its first row, and an all-NULL first row would otherwise come out as
  # `unknown` and fail to join. The cast is read straight off the schema rather
  # than hardcoded, so a boolean flag and a varchar label sit in the same tuple
  # without anyone having to keep a type table in sync with the columns.
  def write_slice(columns, slice)
    connection = Unit.connection
    all_columns = [:id] + columns
    quoted_columns = all_columns.map { |column| connection.quote_column_name(column) }
    casts = all_columns.map { |column| Unit.columns_hash.fetch(column.to_s).sql_type }

    tuples = slice.map do |row|
      literals = row.each_with_index.map { |value, index| "#{connection.quote(value)}::#{casts[index]}" }
      "(#{literals.join(', ')})"
    end

    assignments = columns.map { |column| "#{connection.quote_column_name(column)} = v.#{connection.quote_column_name(column)}" }

    connection.update(<<~SQL.squish)
      UPDATE units AS u
      SET #{assignments.join(', ')}, "updated_at" = CURRENT_TIMESTAMP
      FROM (VALUES #{tuples.join(', ')}) AS v(#{quoted_columns.join(', ')})
      WHERE u."id" = v."id"
    SQL
  end

  # --- reporting ----------------------------------------------------------

  def finish(note = nil)
    summary = @stats.map { |key, value| "#{key}=#{value}" }.join(" ")
    summary += " (#{note})" if note
    Rails.logger.info("[RenuUnitLinksSync] company=#{@company_id} #{summary}")
    @stats
  end
end
