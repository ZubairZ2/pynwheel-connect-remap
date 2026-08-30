module UnitSpaceDetails
  # Accumulates one sync's worth of space detail and writes it in a single pass.
  #
  # Fed from both feeds, flushed once. It accumulates rather than writing as it
  # goes for two reasons that are not optional:
  #
  #   1. The premium baseline is a property-wide frequency count, so nothing can
  #      be decided until every space has been seen.
  #   2. The catalog feed is pulled twice per sync (availableUnitsOnly false then
  #      true). Writing per pass would compute the second baseline over available
  #      spaces only, silently promoting ordinary amenities to premium.
  #
  # The collector asks no questions about the property -- not
  # student_housing_property?, not enable_unit_type_pricing?, not
  # entrata_show_unit_spaces. It stores what the feed gave and nothing when the
  # feed gave nothing. The toggle is checked exactly once, in the serializer.
  class Collector
    attr_reader :stats

    def initialize(community, credentials = nil)
      @community = community
      adapter_class = Adapters.for(community&.data_provider)
      @adapter = adapter_class&.new(community, credentials)
      @records = {}
      @stats   = Hash.new(0)
      @absorbed_catalog = false
    end

    def enabled? = @adapter.present?

    # Merge one feed response into the accumulator. A no-op when the provider has
    # no adapter, so callers never ask whether it is supported.
    def absorb(payload, feed:)
      return unless enabled?

      extracted = @adapter.extract(payload, feed: feed)
      extracted.each do |record|
        key = record.provider_space_id
        next if key.blank?

        @records[key] = @records[key] ? @records[key].merge(record) : record
      end

      @absorbed_catalog = true if feed == :catalog && extracted.any?
      @stats["absorbed_#{feed}"] += extracted.size
    rescue StandardError => e
      # A feed we could not parse must not take the sync down with it.
      @stats["absorb_errors"] += 1
      Rails.logger.warn("[UnitSpaceDetails] absorb(#{feed}) failed for community #{@community&.id}: #{e.class}: #{e.message}")
    end

    # Resolve, join and persist. Never raises: unit and floor-plan data reaching
    # the map on time matters more than the pop-up's chips being fresh, and this
    # runs at the very end of a sync that has already committed them.
    def flush!
      return @stats unless enabled?

      persist(build_rows)
      @stats
    rescue StandardError => e
      @stats["flush_errors"] += 1
      Rails.logger.error("[UnitSpaceDetails] flush! failed for community #{@community.id}: #{e.class}: #{e.message}")
      @stats
    end

    private

    def build_rows
      records = @records.values.select(&:any_content?)
      @stats["records"]      = @records.size
      @stats["with_content"] = records.size
      return [] if records.empty?

      premium = PremiumAmenityPolicy.new(records)
      terms   = LeaseTermPolicy.new(@community)
      units   = unit_ids_by_provider_key
      now     = Time.current

      @stats["baseline_amenities"] = premium.baseline.size
      @stats["amenity_sample"]     = premium.sample_size

      records.filter_map do |record|
        unit_id = units[record.provider_unit_id]
        if unit_id.nil?
          @stats["unmatched_units"] += 1
          next
        end

        chosen = terms.choose(record.lease_terms)
        @stats["with_terms"] += 1 if chosen

        {
          unit_id: unit_id,
          community_id: @community.id,
          provider: @community.data_provider,
          provider_space_id: record.provider_space_id,
          space_letter: record.space_letter,
          space_option: record.space_option,
          amenities: record.amenities.map { |a| PremiumAmenityPolicy.normalize(a) }.uniq,
          premium_amenities: premium.premium_for(record),
          lease_terms: record.lease_terms,
          metadata: record.metadata,
          lease_start_date: chosen&.dig(:start_date),
          lease_end_date: chosen&.dig(:end_date),
          space_rent: chosen&.dig(:rent),
          synced_at: now,
          created_at: now,
          updated_at: now
        }
      end
    end

    def persist(rows)
      if rows.any?
        rows.each_slice(500) do |batch|
          UnitSpaceDetail.upsert_all(batch, unique_by: :index_unit_space_details_on_unit_id)
        end
        @stats["written"] = rows.size
      end

      prune(rows.map { |r| r[:unit_id] })
    end

    # Rows for spaces the feed no longer describes are stale and must go -- a
    # bedroom that loses its letter should lose its tab.
    #
    # Guarded on having actually read a catalog response: a sync that failed
    # halfway would otherwise wipe the property's detail and leave the map
    # rendering a pop-up with no tabs.
    def prune(written_unit_ids)
      return unless @absorbed_catalog

      stale = UnitSpaceDetail.for_community(@community.id)
      stale = stale.where.not(unit_id: written_unit_ids) if written_unit_ids.any?
      @stats["pruned"] = stale.delete_all
    end

    def unit_ids_by_provider_key
      Unit.where(community_id: @community.id)
          .pluck(:provider_unit_id, :id)
          .to_h
    end
  end
end
