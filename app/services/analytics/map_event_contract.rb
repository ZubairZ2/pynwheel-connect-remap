module Analytics
  # The single source of truth for what a map interaction *is*: what it is called
  # to a client, which of its fields are durable dimensions, and whether it earns
  # a row in sdk_events at all.
  #
  # Three consumers, one definition:
  #
  #   * SdkAnalyticsService      -- deciding what to persist and in which column.
  #   * SdkPayloadBuilderService -- handing the SDK this property's allowlist and
  #                                 the contract below (see .client_contract).
  #   * pyn-map-sdk-v1.js        -- applies that contract. It holds no copy of
  #                                 it, so nothing here needs a matching SDK edit.
  #
  # ── Publishing a new interaction ──────────────────────────────────────────────
  #
  #   1. pynwheel-maps: add the event name to src/analytics/index.js and call
  #      track() with the id of what was clicked (unit_id, floorplan_id or
  #      amenity_id). The SDK fills in every other detail from that id.
  #   2. Here: one line in ACTIONS, one entry in PUBLISHED_ACTIONS.
  #   3. It now appears on the CMS screen, off by default, for any property to
  #      tick. No SDK release, no migration.
  #
  # A new *field* is one line in PUBLISHED_FIELDS, plus a DIMENSIONS line and a
  # migration if a report should read it from its own column.
  #
  # Nothing here names a client. Renu is the first consumer of the data layer and
  # Jonah is the second; both read the same actions, because a schema that
  # branches per client stops being a schema.
  class MapEventContract
    # Bump on any change to what a client receives: ACTIONS, PUBLISHED_ACTIONS,
    # PUBLISHED_FIELDS. Sent to the SDK inside .client_contract.
    #
    # 2: the action is worded from the clicked thing ("101A_clicked"),
    #    company_name added, schema_version / visitor_id / link_index removed.
    CONTRACT_VERSION = 2

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
    #
    # Keys are the captured event *name*. The SDK captures marker clicks as
    # `unit_marker` with a type of click; `unit_marker_click` is the session
    # counter's spelling, and keying on it here matched nothing.
    #
    # The action on the right is what sdk_events.action stores and what a
    # property's allowlist names. A client's GA4 receives it worded after the
    # clicked thing instead -- see PUBLISHED_ACTIONS.
    ACTIONS = {
      # Per-unit CTAs.
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
      "unit_marker"          => "unit_selected",
      "amenity_marker"       => "amenity_selected",
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

    # ── Each published action ────────────────────────────────────────────────
    #
    # label   -- what the CMS screen calls it.
    # subject -- how a client's GA4 names it. The parts are joined with spaces,
    #            cleaned to letters, digits and underscores, and given a
    #            "_clicked" suffix: ["unit_name"] on unit 101-A gives
    #            "101A_clicked". A part is
    #
    #              "key"          a published field, or failing that a raw
    #                             metadata key
    #              ["a", "b"]     the first of those keys with a value
    #              "?key"         a key that may be absent
    #              "=text"        literal text
    #
    #            A required part with no value, or an empty subject, publishes
    #            the stable action instead, so a push never reads "_clicked".
    PUBLISHED_ACTIONS = {
      "apply_clicked" => {
        label: "Apply Now clicked", subject: %w[link_label]
      },
      "schedule_tour_clicked" => {
        label: "Schedule a Tour clicked", subject: %w[link_label]
      },
      "virtual_tour_clicked" => {
        label: "3D / virtual tour link clicked", subject: %w[link_label]
      },
      "additional_link_clicked" => {
        label: "Second configurable link clicked", subject: %w[link_label]
      },
      "unit_selected" => {
        label: "A unit was opened, from the map or a card", subject: %w[unit_name]
      },
      "floor_plan_selected" => {
        label: "A floor plan was opened", subject: %w[floor_plan_name]
      },
      "amenity_selected" => {
        label: "An amenity was opened", subject: %w[amenity_name]
      },
      # "101A_favorite_saved_clicked". Whatever was saved: a unit, a floor plan,
      # an amenity, or a gallery image, whose name is never a published field.
      "unit_favorited" => {
        label:   "A unit, floor plan or amenity was saved or unsaved",
        subject: [%w[unit_name floor_plan_name amenity_name gallery_image_name], "=favorite", "favorite_state"]
      },
      "share_clicked" => {
        label: "Favourites were shared", subject: %w[=Share shared_entity ?share_target]
      },
      "gallery_viewed" => {
        label: "The gallery was opened", subject: %w[=Gallery]
      },
      "map_filter_used" => {
        label: "Any map filter was applied", subject: %w[filter_name ?filter_value]
      }
    }.freeze

    ACTION_LABELS = PUBLISHED_ACTIONS.transform_values { |spec| spec[:label] }.freeze

    # ── What a client's data layer receives ──────────────────────────────────
    #
    # [published key, metadata source], in the order a client reads them. A
    # source is a metadata key, or a list of keys where the first with a value
    # wins. The ambient fields -- session, time, company, property, page -- come
    # first and are not listed; the SDK stamps them from the property payload.
    #
    # Every field is written on every push, explicitly null when it does not
    # apply, because GTM keeps a key's last value when a push omits it.
    #
    # `unit_id` and `floor_plan_id` are the PMS's ids, which is what a client can
    # reconcile against their own systems; Pynwheel's keys are only a fallback
    # for a feed that carries none. `link_index` is stored but not published: a
    # CMS slot number is ours, not a client's.
    PUBLISHED_FIELDS = [
      ["link_label",      "link_label"],
      ["link_url",        "link_url"],
      ["unit_id",         %w[provider_unit_id unit_id]],
      ["unit_name",       "unit_name"],
      ["building",        "building"],
      ["floor_level",     "floor_level"],
      ["floor_plan_id",   %w[provider_floorplan_id floorplan_id]],
      ["floor_plan_name", "floorplan_name"],
      ["bedrooms",        "bedrooms"],
      ["bathrooms",       "bathrooms"],
      ["square_footage",  "square_footage"],
      ["amenity_id",      "amenity_id"],
      ["amenity_name",    "amenity_name"],
      ["filter_name",     "filter_name"],
      ["filter_value",    "filter_value"],
      ["favorite_state",  "favorite_state"],
      ["shared_entity",   "shared_entity"],
      ["share_target",    "share_target"]
    ].map(&:freeze).freeze

    # Sent as strings whatever their source type, so a GA4 dimension never holds
    # "34" on one event and 34 on the next.
    PUBLISHED_ID_FIELDS = %w[company_id property_id unit_id floor_plan_id amenity_id].freeze

    # What a property gets when it enables the data layer and names no actions:
    # every click-through the map renders. Apply Now and the three CMS link
    # slots are the interactions that end in the visitor leaving for the
    # client's own funnel, so a property turning the data layer on wants all
    # four without having to ask.
    #
    # Everything else the contract publishes -- selections, favourites, shares,
    # filters -- is a browsing signal. Those are tracked and stored either way;
    # they reach a client's GA4 only when that client asks for them, because
    # each one is another event they have to name and register at their end.
    #
    # Listed rather than derived from ACTIONS' first group, so adding a CTA to
    # the contract is not silently a change to what every property publishes.
    DEFAULT_DATA_LAYER_ACTIONS = %w[
      apply_clicked
      schedule_tour_clicked
      virtual_tour_clicked
      additional_link_clicked
    ].freeze

    # Every action a property may opt into, derived rather than listed so the two
    # can never drift.
    KNOWN_ACTIONS = ACTIONS.values.flat_map { |v| v.is_a?(Hash) ? v[:map].values : v }.uniq.freeze

    # A half-registered action fails here, at boot, rather than as a blank label
    # on the CMS screen or a stable name in a client's report.
    unless (KNOWN_ACTIONS - PUBLISHED_ACTIONS.keys).empty? && (PUBLISHED_ACTIONS.keys - KNOWN_ACTIONS).empty?
      raise ArgumentError, "MapEventContract: ACTIONS and PUBLISHED_ACTIONS disagree on " \
                           "#{((KNOWN_ACTIONS - PUBLISHED_ACTIONS.keys) | (PUBLISHED_ACTIONS.keys - KNOWN_ACTIONS)).join(', ')}"
    end

    unless (DEFAULT_DATA_LAYER_ACTIONS - KNOWN_ACTIONS).empty?
      raise ArgumentError, "MapEventContract: unknown default action #{(DEFAULT_DATA_LAYER_ACTIONS - KNOWN_ACTIONS).join(', ')}"
    end

    # Everything the SDK needs to publish an event, and nothing it does not. The
    # SDK keeps no copy of any of this; see PYN_EVENT_CONTRACT there.
    CLIENT_CONTRACT = {
      version:  CONTRACT_VERSION,
      events:   ACTIONS,
      fields:   PUBLISHED_FIELDS,
      idFields: PUBLISHED_ID_FIELDS,
      subjects: PUBLISHED_ACTIONS.transform_values { |spec| spec[:subject] }
    }.freeze

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

      "amenity_id"           => [:amenity_id,           :integer],
      "amenity_name"         => [:amenity_name,         :string],

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
      # Stable action for an event, or nil when it has no published name.
      #
      # Takes the metadata because an event's action can depend on which thing
      # inside it was clicked -- see the `tour_button` entry in ACTIONS. An event
      # whose discriminator is missing resolves to nil rather than to a default:
      # a wrong action in a client's GA4 is worse than a missing one, because
      # only the missing one is visible to them.
      #
      # Clicks only, as in the SDK: `unit_marker` is captured for hovers too, and
      # a hover is not a selection.
      def action_for(name, metadata = nil, event_type = "click")
        return nil unless event_type.to_s == "click"

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
          version:      CONTRACT_VERSION,
          # Only a property that publishes needs to be told how.
          contract:     enabled == true ? CLIENT_CONTRACT : nil
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
