module Analytics
  # The single source of truth for what a map interaction *is*: what it is called
  # to a client, which of its fields are durable dimensions, and whether it earns
  # a row in sdk_events at all.
  #
  # Three consumers, one definition:
  #
  #   * SdkAnalyticsService      -- deciding what to persist and in which column.
  #   * SdkPayloadBuilderService -- telling the SDK which actions this property
  #                                 may push to the embedding page's data layer.
  #   * pyn-map-sdk-v1.js        -- the client-side mirror (see PYN_EVENT_CONTRACT
  #                                 there). It must be edited in step with this
  #                                 file; CONTRACT_VERSION is how they announce
  #                                 agreement, and every event carries it.
  #
  # Nothing here names a client. Renu is the first consumer of the data layer and
  # Jonah is the second; both read the same actions, because a schema that
  # branches per client stops being a schema.
  class MapEventContract
    # Bump on any change to ACTIONS or DIMENSIONS below, and in the SDK's mirror.
    # Stored on every event so a reader can tell which vocabulary produced a row
    # and a stale cached SDK is visible in the data rather than inferred.
    CONTRACT_VERSION = 1

    # ── Internal event name → client-facing action ────────────────────────────
    #
    # Two vocabularies on purpose. The left side is ours and churns with the UI;
    # the right side is a published interface a client builds GTM triggers
    # against, so it changes only with notice. An internal rename costs one line
    # here and nothing downstream.
    #
    # An event absent from this map is still tracked and still stored -- it just
    # has no client-facing name yet, so it can never reach a data layer.
    #
    # A value is either a published action, or a `by`/`map` pair that picks one
    # from a dimension of the event. The second form exists because one internal
    # event can be several client-facing things: `tour_button` fires for all three
    # CMS link slots, so mapping it to a single action would report a 3D Tour
    # click as a scheduled tour. Discriminating on `link_kind` -- the slot's
    # stable identity, not its CMS label -- keeps that honest.
    ACTIONS = {
      # Per-unit CTAs. The two PYN-1655 ships with.
      "apply_now"            => "apply_clicked",
      "space_apply_now"      => "apply_clicked",
      "tour_button"          => {
        by:  "link_kind",
        map: {
          "schedule_tour" => "schedule_tour_clicked",
          "virtual_tour"  => "virtual_tour_clicked",
          "additional"    => "additional_link_clicked"
        }
      },

      # Already tracked, already carrying dimensions, waiting only on a property
      # to switch them on. Named now so enabling one later is a CMS toggle and
      # not an SDK release -- the reason the allowlist is server-driven.
      "unit_card"            => "unit_selected",
      "floor_plan_card"      => "floor_plan_selected",
      "amenity_card"         => "amenity_selected",
      "unit_marker_click"    => "unit_selected",
      "amenity_marker_click" => "amenity_selected",
      "save_favorite"        => "unit_favorited",
      "delete_favorite"      => "unit_favorited",
      "share_favorites"      => "share_clicked",
      "sent_favorite"        => "share_clicked",
      "gallery_view"         => "gallery_viewed",
      "bedroom_filter"       => "map_filter_used",
      "availability_filter"  => "map_filter_used",
      "square_feet_filter"   => "map_filter_used",
      "pricing_filter"       => "map_filter_used",
      "sorting_filter"       => "map_filter_used"
    }.freeze

    # Plain-language name for each published action, for the CMS screen and for
    # anything we hand a client. Here rather than in a view, because the action
    # names and what they mean are one vocabulary and drift if kept apart.
    ACTION_LABELS = {
      "apply_clicked"           => "Apply Now clicked",
      "schedule_tour_clicked"   => "Schedule a Tour clicked",
      "virtual_tour_clicked"    => "3D / virtual tour link clicked",
      "additional_link_clicked" => "Second configurable link clicked",
      "unit_selected"           => "A unit was opened, from the map or a card",
      "floor_plan_selected"     => "A floor plan was opened",
      "amenity_selected"        => "An amenity was opened",
      "unit_favorited"          => "A unit was saved or unsaved",
      "share_clicked"           => "Favourites were shared",
      "gallery_viewed"          => "The gallery was opened",
      "map_filter_used"         => "Any map filter was applied"
    }.freeze

    # What a property gets when it enables the data layer and names no actions.
    # PYN-1655: "Only the two per-unit CTA interactions Renu needs now."
    DEFAULT_DATA_LAYER_ACTIONS = %w[apply_clicked schedule_tour_clicked].freeze

    # Every action a property may opt into, derived rather than listed so the two
    # can never drift.
    KNOWN_ACTIONS = ACTIONS.values.flat_map { |v| v.is_a?(Hash) ? v[:map].values : v }.uniq.freeze

    # ── Durability ────────────────────────────────────────────────────────────
    #
    # Which events earn a row in sdk_events. Hover fires on every pointer pass
    # over a marker and lifecycle events fire on every tab switch; both are pure
    # volume, and both already have the only consumer they have ever had -- a
    # counter on the session row. Excluding them is the difference between a
    # table that grows with interactions and one that grows with mouse movement.
    NON_DURABLE_TYPES = %w[hover state].freeze

    # ── Dimensions ────────────────────────────────────────────────────────────
    #
    # Metadata key → [column, caster]. A key listed here is lifted out of the
    # metadata bag into its own column; everything else falls through to
    # `properties`. Adding a dimension is a migration plus one line; adding a
    # metadata field that only an audit reads is zero lines.
    #
    # Note the deliberate pairing of ids. `unit_id` is Pynwheel's primary key and
    # `provider_unit_id` is the PMS's -- the one a client reconciles against
    # their own systems, and the one the client-facing schema publishes *as*
    # `unit_id`. Storing both means neither side has to guess which it is
    # holding. Same for floor plans.
    DIMENSIONS = {
      "unit_id"              => [:unit_id,              :integer],
      "provider_unit_id"     => [:provider_unit_id,     :string],
      "unit_name"            => [:unit_name,            :string],
      "building"             => [:building,             :string],
      "floor_level"          => [:floor_level,          :integer],

      "floorplan_id"         => [:floorplan_id,         :integer],
      "provider_floorplan_id" => [:provider_floorplan_id, :string],
      "floorplan_name"       => [:floorplan_name,       :string],
      "bedrooms"             => [:bedrooms,             :decimal],
      "bathrooms"            => [:bathrooms,            :decimal],
      "square_footage"       => [:square_footage,       :integer],

      "link_label"           => [:link_label,           :string],
      "link_url"             => [:link_url,             :text],
      "link_index"           => [:link_index,           :integer],

      "page_url"             => [:page_url,             :text]
    }.freeze

    # Every dimension column, all nil. `insert_all` sends one multi-row VALUES
    # statement and so requires every row to carry an identical key set -- and no
    # two events carry the same dimensions, since a floor plan click has no
    # building and an amenity click has neither. Starting each row from this
    # template makes the shapes match, and writes an explicit NULL for what an
    # event genuinely does not have.
    BLANK_DIMENSIONS = DIMENSIONS.values.to_h { |column, _| [column, nil] }.freeze

    # Long-tail metadata limits. The old sanitiser capped a payload at 15 keys,
    # which silently truncated PYN-1655's 18-field payload by roughly a fifth
    # with no error anywhere. Dimensions are now lifted out before this cap
    # applies, so the cap governs only the extras -- and 30 of those is already
    # far more than any event sends.
    MAX_PROPERTY_KEYS   = 30
    MAX_STRING_LENGTH   = 500
    MAX_TEXT_LENGTH     = 2_000
    # Digits are allowed now. The old pattern was /\A[a-z_]{1,50}\z/, which threw
    # away any key with a number in it -- `link_1_label`, `amenity_2` -- without
    # reporting it.
    KEY_PATTERN         = /\A[a-z][a-z0-9_]{0,49}\z/

    SCALAR_TYPES = [String, Integer, Float, TrueClass, FalseClass, BigDecimal].freeze

    class << self
      # Client-facing action for an event, or nil when it has no published name.
      #
      # Takes the metadata because an event's action can depend on which thing
      # inside it was clicked -- see the `tour_button` entry in ACTIONS. An event
      # whose discriminator is missing resolves to nil rather than to a default:
      # a wrong action in a client's GA4 is worse than a missing one, because
      # only the missing one is visible to them.
      def action_for(name, metadata = nil)
        entry = ACTIONS[name.to_s]
        return entry unless entry.is_a?(Hash)
        return nil unless metadata.is_a?(Hash)

        entry[:map][metadata[entry[:by]].to_s]
      end

      # Does this event earn a row in sdk_events?
      def durable?(_name, event_type)
        NON_DURABLE_TYPES.exclude?(event_type.to_s)
      end

      # Splits a sanitised metadata bag into typed dimension columns and the
      # leftover `properties` blob. One pass, no intermediate copies.
      def split_metadata(meta)
        dimensions = {}
        properties = {}
        return [dimensions, properties] unless meta.is_a?(Hash)

        meta.each do |key, value|
          column, caster = DIMENSIONS[key]
          if column
            cast = cast_value(value, caster)
            dimensions[column] = cast unless cast.nil?
          elsif properties.size < MAX_PROPERTY_KEYS
            properties[key] = value
          end
        end

        [dimensions, properties]
      end

      # Accepts only snake_case keys with scalar values, trimmed to length.
      # Rejecting rather than coercing: a nested object in an analytics payload
      # is a call-site bug, and silently flattening it hides the bug.
      #
      # The to_unsafe_h line is load-bearing. Metadata arrives from the endpoint
      # as ActionController::Parameters, which has not been a Hash since Rails 5
      # -- so the old `is_a?(Hash)` guard discarded every event's metadata,
      # silently, for the entire life of the feature. 1,697 sessions in this
      # database have counter keys and not one metadata key. `unsafe` is correct
      # here: the allowlist below is the sanitiser, and it is stricter than any
      # permit list, admitting only snake_case keys with scalar values.
      def sanitize_metadata(meta)
        meta = meta.to_unsafe_h if meta.respond_to?(:to_unsafe_h)
        return {} unless meta.is_a?(Hash)

        out = {}
        meta.each do |key, value|
          key = key.to_s
          next unless key.match?(KEY_PATTERN)
          next unless SCALAR_TYPES.any? { |type| value.is_a?(type) }

          out[key] = value.is_a?(String) ? value.slice(0, MAX_TEXT_LENGTH) : value
        end
        out
      end

      # The data layer settings in force for a property, with every value
      # validated against this contract. Never trusts the stored blob: an action
      # that is not a known action cannot be emitted, whatever the CMS holds.
      def data_layer_config(community)
        stored = community.map_analytics_settings.presence || {}
        config = stored["data_layer"] || stored[:data_layer] || {}

        enabled = config["enabled"]
        actions = Array(config["actions"]).map(&:to_s) & KNOWN_ACTIONS
        actions = DEFAULT_DATA_LAYER_ACTIONS if actions.empty?

        {
          enabled:      enabled == true,
          actions:      actions,
          targetOrigin: normalize_origin(config["target_origin"]),
          version:      CONTRACT_VERSION
        }
      end

      # When the interaction actually happened.
      #
      # Client timestamps cannot be trusted as wall-clock -- a device with a
      # wrong clock would land its events outside every reporting window, or in
      # the future. They *can* be trusted as relative offsets within a single
      # batch, since they come from one monotonic-enough source seconds apart.
      #
      # So: anchor the batch's newest event to server receipt time and place the
      # rest at their true offsets behind it. Ordering and spacing survive, skew
      # does not. The clamp catches a client that sends a wild offset.
      def occurred_at_for(event_ts, batch_latest_ts, received_at)
        return received_at unless event_ts.is_a?(Numeric) && batch_latest_ts.is_a?(Numeric)

        offset_seconds = (batch_latest_ts - event_ts) / 1000.0
        return received_at unless offset_seconds.finite?
        return received_at if offset_seconds.negative? || offset_seconds > MAX_BATCH_SPAN_SECONDS

        received_at - offset_seconds
      end

      # A batch spanning more than this is a clock artefact, not a real session
      # gap -- the SDK flushes every five seconds and rotates its segment after
      # two minutes of idle, so nothing legitimate reaches an hour.
      MAX_BATCH_SPAN_SECONDS = 3_600

      private

      def cast_value(value, caster)
        case caster
        when :integer then Integer(value, exception: false)
        when :decimal then cast_decimal(value)
        when :text    then value.to_s.slice(0, MAX_TEXT_LENGTH).presence
        else               value.to_s.slice(0, MAX_STRING_LENGTH).presence
        end
      end

      def cast_decimal(value)
        return value if value.is_a?(BigDecimal)
        return BigDecimal(value.to_s) if value.is_a?(Numeric)

        BigDecimal(value.to_s)
      rescue ArgumentError, TypeError
        nil
      end

      # Only an exact scheme://host[:port] is a usable postMessage target. A path,
      # a wildcard or a bare hostname would silently drop every message, so an
      # unusable value becomes nil (broadcast) rather than a guess.
      def normalize_origin(value)
        origin = value.to_s.strip
        return nil if origin.blank?

        uri = URI.parse(origin)
        return nil unless uri.is_a?(URI::HTTP) && uri.host.present?

        port = uri.port && uri.port != uri.default_port ? ":#{uri.port}" : ""
        "#{uri.scheme}://#{uri.host}#{port}"
      rescue URI::InvalidURIError
        nil
      end
    end
  end
end
