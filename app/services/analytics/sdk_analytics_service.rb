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

    SESSION_START_EVENT = "map_load".freeze
    SESSION_END_EVENT   = "map_session_end".freeze

    VISITED_PAGES = {
      "map_load"       => "Map main page",
      "gallery_view"   => "Gallery view",
      "view_favorites" => "Favorites page",
    }.freeze

    def initialize(community:, client_type:, session_id:, partner:, sdk_version: "v1", product: "web")
      @community   = community
      @timezone    = community.get_time_zone
      @client_type = client_type
      @session_id  = session_id
      @partner     = partner
      @sdk_version = sdk_version
      @product     = product
    end

    # Main entry point — called with a full batch of events from one SDK flush.
    def process_batch(events:, device_context: nil)
      return if events.blank?

      session = nil

      events.each do |raw|
        name = raw["name"].to_s.strip
        type = raw["type"].to_s.presence || "click"
        meta = sanitize_metadata(raw["metadata"])

        if name == SESSION_END_EVENT
          (session || find_current_session)&.update_column(:end_datetime, now)
          next
        end

        session ||= name == SESSION_START_EVENT ? create_session : find_or_create_session
        next unless session

        key = "#{name}_#{type}"
        increment_event(session, key)
        merge_event_metadata(session, meta)
        update_interactions(session, key)
        update_visited_pages(session, name)
        store_full_event(session, raw)
      end

      if session
        # Store complete device_context object from payload
        session.device_context = merge_device_context(session.device_context, device_context)
      end

      session&.save

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
        community_id:                @community.id,
        client_type:                 @client_type,
        session_id:                  @session_id,
        partner:                     @partner,
        product:                     @product,
        sdk_version:                 @sdk_version,
        community_time_zone:         @timezone,
        start_datetime:              now,
        map_interactions:            0,
        map_interactions_last_active: nil,
        events:                      {},
        device_context:              {},
        full_event:                  {},
        visited_pages:               []
      )
    end

    def increment_event(session, key)
      counts = session.events || {}
      counts[key] = (counts[key] || 0) + 1
      session.events = counts
    end

    def merge_event_metadata(session, metadata)
      return if metadata.blank?
      current = session.events || {}
      metadata.each do |k, v|
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

    # Dynamic sanitizer: any snake_case key ≤ 50 chars, scalar value ≤ 300 chars.
    # Adding new metadata fields requires zero code changes.
    def sanitize_metadata(meta)
      return {} unless meta.is_a?(Hash)
      out = {}
      meta.each do |k, v|
        break if out.size >= 15
        key = k.to_s
        next unless key.match?(/\A[a-z_]{1,50}\z/)
        next unless [String, Integer, Float, TrueClass, FalseClass].include?(v.class)
        out[key] = v.is_a?(String) ? v.slice(0, 300) : v
      end
      out
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

    def store_full_event(session, raw_event)
      return if raw_event.blank?
      event_name = raw_event["name"].to_s.strip
      current = session.full_event || {}

      # Initialize array for this event name if first occurrence
      current[event_name] ||= []

      # Append complete event with timestamp for chronological reference
      current[event_name] << raw_event.merge("ts" => now.to_i)

      session.full_event = current
    end

    def now
      Time.now.in_time_zone(@timezone)
    end
  end
end
