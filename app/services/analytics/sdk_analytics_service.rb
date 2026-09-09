module Analytics
  class SdkAnalyticsService

    # What counts as a "meaningful interaction" per client type.
    # Adding a new client type = one line here. Nothing else changes.
    INTERACTION_EVENTS = {
      "web_map"    => %w[
        unit_marker_click apply_now_click save_favorite_click sent_favorite_click
        unit_card_click floor_plan_card_click amenity_card_click
        share_favorites_click tour_button_click
        share_email_click share_text_click share_whatsapp_click share_snapchat_click share_copy_click
      ].to_set,
      "touch_map"  => %w[
        unit_marker_click apply_now_click save_favorite_click
        unit_card_click floor_plan_card_click amenity_card_click
      ].to_set,
      "ipad_map"   => %w[
        unit_marker_click apply_now_click appointment_scheduled_click
        unit_card_click floor_plan_card_click
      ].to_set,
      "mobile_app" => %w[
        unit_marker_click apply_now_click save_favorite_click
        unit_card_click floor_plan_card_click amenity_card_click
      ].to_set,
    }.freeze
    DEFAULT_INTERACTION_EVENTS = %w[unit_marker_click apply_now_click unit_card_click].to_set.freeze

    SESSION_START_EVENT      = "map_load".freeze
    SESSION_END_EVENT        = "map_session_end".freeze

    # Lifecycle state events — tracked as counters, never close the session.
    SESSION_LIFECYCLE_EVENTS = %w[
      map_session_background
      map_session_active
      map_session_idle
    ].to_set.freeze

    VISITED_PAGES = {
      "map_load"            => "Map main page",
      "gallery_view"        => "Gallery view",
      "view_favorites"      => "Favorites page",
      # Matches the string MetroAnalyticsService and IpadAnalyticsService already
      # write, so SDK sessions land in the same reporting bucket as the Windows
      # and iPad apps. (Those two upcase it — a pre-existing inconsistency across
      # visited_pages, not introduced here.)
      "neighborhood_view"   => "Neighborhood Page",
    }.freeze

    def initialize(community:, client_type:, session_id:, partner:,
                   parent_sdk_session_id: nil, sdk_version: "v1", product: "web")
      @community             = community
      @timezone              = community.get_time_zone
      @client_type           = client_type
      @session_id            = session_id
      @partner               = partner
      @parent_sdk_session_id = parent_sdk_session_id
      @sdk_version           = sdk_version
      @product               = product
    end

    # Main entry point — called with a full batch of events from one SDK flush.
    #
    # Two writes for the whole batch, whatever its size: one UPDATE on the
    # session row (counters, visited pages, device context) and one INSERT
    # carrying every durable event. Nothing inside the loop touches the database.
    def process_batch(events:, device_context: nil)
      return if events.blank?

      session      = nil
      received_at  = now
      # The newest client timestamp in the batch anchors every other event's
      # offset — see MapEventContract.occurred_at_for for why a client's
      # wall-clock is never trusted directly.
      latest_ts    = events.filter_map { |raw| raw["ts"] if raw["ts"].is_a?(Numeric) }.max
      pending_rows = []

      events.each do |raw|
        name = raw["name"].to_s.strip
        type = raw["type"].to_s.presence || "click"
        meta = MapEventContract.sanitize_metadata(raw["metadata"])

        if name == SESSION_END_EVENT
          (session || find_current_session)&.update_column(:end_datetime, received_at)
          next
        end

        session ||= if name == SESSION_START_EVENT
          create_session
        elsif SESSION_LIFECYCLE_EVENTS.include?(name)
          find_current_session  # never create a session for lifecycle events — discard if orphaned
        else
          find_or_create_session
        end
        next unless session

        key = "#{name}_#{type}"
        increment_event(session, key)
        merge_event_metadata(session, meta)
        update_interactions(session, key)
        update_visited_pages(session, name)

        next unless MapEventContract.durable?(name, type)

        pending_rows << build_event_row(
          name:        name,
          event_type:  type,
          metadata:    meta,
          occurred_at: MapEventContract.occurred_at_for(raw["ts"], latest_ts, received_at)
        )
      end

      if session
        # Store complete device_context object from payload
        session.device_context = merge_device_context(session.device_context, device_context)
        session.save
      end

      persist_events(pending_rows, session)

    rescue StandardError => e
      Rails.logger.error("[SdkAnalyticsService#process_batch] #{e.class}: #{e.message}\n#{e.backtrace.first(5).join("\n")}")
    end

    private

    ALLOWED_CONTEXT_KEYS = %w[
      device_type viewport_width viewport_height referrer
      user_agent sdk_version os_name os_version
      kiosk_id device_uuid app_version
    ].freeze

    def find_or_create_session
      last = find_current_session
      return create_session unless last
      # Client rotates session_id UUID on idle, so reaching here with the same
      # session_id means the session is still active. The idle check is a
      # server-side safety net for clients that do not support UUID rotation.
      session_idle?(last) ? create_session : last.tap { |s| s.updated_at = now }
    end

    def find_current_session
      SdkSession.where(
        community_id: @community.id,
        session_id:   @session_id,
        client_type:  @client_type
      ).order(:created_at).last
    end

    def create_session
      SdkSession.create!(
        community_id:                 @community.id,
        client_type:                  @client_type,
        session_id:                   @session_id,
        parent_sdk_session_id:        @parent_sdk_session_id,
        partner:                      @partner,
        product:                      @product,
        sdk_version:                  @sdk_version,
        community_time_zone:          @timezone,
        start_datetime:               now,
        map_interactions:             0,
        map_interactions_last_active: nil,
        events:                       {},
        device_context:               {},
        visited_pages:                []
      )
    end

    def increment_event(session, key)
      counts = session.events || {}
      counts[key] = (counts[key] || 0) + 1
      session.events = counts
    end

    # Session-level metadata: the last-value bag the existing dashboards read
    # (SdkSession#share_url and friends).
    #
    # Contract dimensions are deliberately excluded. They describe *this* click —
    # its unit, its floor plan, its link — and folding them into a per-session
    # hash both loses them to the next event carrying the same key and grows the
    # JSONB column every flush rewrites. They belong in sdk_events, one row per
    # interaction, which is the reason that table exists.
    def merge_event_metadata(session, metadata)
      return if metadata.blank?
      current = session.events || {}
      metadata.each do |k, v|
        next if MapEventContract::DIMENSIONS.key?(k)
        # Arrays: accumulate unique values (e.g. viewed unit IDs)
        # Scalars: last-write-wins (e.g. current floor)
        current[k] = v.is_a?(Array) ? ((current[k] || []) + v).uniq : v
      end
      session.events = current
    end

    def update_interactions(session, event_key)
      return unless interaction_event?(event_key)
      last = session.map_interactions_last_active&.in_time_zone(@timezone)
      return if last && !session_idle_at?(last)
      session.map_interactions = (session.map_interactions || 0) + 1
      session.map_interactions_last_active = now
    end

    def update_visited_pages(session, event_name)
      page = VISITED_PAGES[event_name]
      return unless page
      session.visited_pages = ((session.visited_pages || []) | [page])
    end

    def interaction_event?(event_key)
      (INTERACTION_EVENTS[@client_type] || DEFAULT_INTERACTION_EVENTS).include?(event_key)
    end

    def session_idle?(session)
      session_idle_at?(session.updated_at&.in_time_zone(@timezone))
    end

    def session_idle_at?(dt)
      return false unless dt
      ((now.to_datetime - dt.to_datetime) * 24 * 60).to_i >= ENV.fetch("IDLE_TIME_MAPS", 10).to_i
    end

    def sanitize_context(context)
      return {} if context.blank?
      # Handle ActionController::Parameters and regular hashes
      context_h = context.is_a?(ActionController::Parameters) ? context.to_unsafe_hash : context.to_h
      # Convert all keys to strings for consistent comparison
      stringified = context_h.transform_keys { |k| k.to_s }
      stringified.slice(*ALLOWED_CONTEXT_KEYS)
    end

    def merge_device_context(existing, incoming)
      return existing if incoming.blank?
      sanitized = sanitize_context(incoming)
      (existing || {}).merge(sanitized)
    end

    # ── sdk_events ────────────────────────────────────────────────────────────

    # One row, built entirely in memory. The scope columns are identical for
    # every event in a batch, so they are read off the instance rather than
    # recomputed per row.
    #
    # BLANK_DIMENSIONS comes first so every row in the batch has the same keys.
    # `insert_all` builds a single multi-row VALUES statement and rejects rows
    # whose shapes differ, and no two events carry the same dimensions — a floor
    # plan click has no building, an amenity click has neither.
    def build_event_row(name:, event_type:, metadata:, occurred_at:)
      dimensions, properties = MapEventContract.split_metadata(metadata)

      MapEventContract::BLANK_DIMENSIONS.merge({
        session_id:            @session_id,
        parent_sdk_session_id: @parent_sdk_session_id,
        community_id:          @community.id,
        company_id:            @community.company_id,
        client_type:           @client_type,
        partner:               @partner,
        product:               @product,
        sdk_version:           @sdk_version,
        name:                  name,
        action:                MapEventContract.action_for(name, metadata),
        event_type:            event_type,
        occurred_at:           occurred_at,
        properties:            properties,
        created_at:            occurred_at
      }).merge(dimensions)
    end

    # One INSERT for the whole batch. `insert_all` skips instantiation,
    # validation and callbacks, which is what makes a 100-event flush a single
    # statement — every value in the row was already validated by the contract on
    # the way in.
    #
    # This replaces the old `full_event` blob. That appended each event to a
    # JSONB column and rewrote the whole column, and its GIN index, on every
    # five-second flush; nothing ever read it back.
    #
    # Analytics is best-effort by design, so a failed insert is logged and
    # dropped rather than raised. A bad row must never turn a visitor's click
    # into an error response.
    def persist_events(rows, session)
      return if rows.empty?

      rows.each { |row| row[:sdk_session_id] = session&.id }
      SdkEvent.insert_all(rows)
    rescue StandardError => e
      Rails.logger.error("[SdkAnalyticsService#persist_events] #{e.class}: #{e.message}")
    end

    def now
      Time.now.in_time_zone(@timezone)
    end
  end
end
