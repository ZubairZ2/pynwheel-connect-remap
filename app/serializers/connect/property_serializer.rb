module Connect
  # Row payload for the Pynwheel Connect "Properties" listing (communities).
  #
  # Emits snake_case scalars and already-resolved state keys ("ok" / "warn" /
  # "crit" / "neutral"); the labels and colours those keys map to live in the
  # frontend generator layer.
  class PropertySerializer
    LIFECYCLE_STAGES = %w[installed activated production released approval].freeze
    INTEGRATION_STATES = %w[ok warn crit neutral].freeze

    def initialize(community, unit_counts: {})
      @community = community
      @unit_counts = unit_counts
    end

    # `communities` is expected to be preloaded by AccessibleCommunitiesQuery.
    def self.collection(communities)
      communities = communities.to_a
      missing_unit_counts = communities.reject { |c| c.number_of_units.to_i.positive? }.map(&:id)
      unit_counts =
        if missing_unit_counts.any?
          Unit.where(community_id: missing_unit_counts).group(:community_id).count
        else
          {}
        end

      communities.map { |community| new(community, unit_counts: unit_counts).as_json }
    end

    def as_json(*)
      {
        id: community.id,
        name: community.name,
        city: community.city,
        state: community.state,
        location: [community.city.presence, community.state.presence].compact.join(', '),
        unit_count: unit_count,
        company_id: community.company_id,
        company_name: community.company&.name,
        region_name: community.region&.name,
        stage: stage,
        products: products,
        integrations: integrations,
        tour_published: tour_published?,
        data_provider: community.data_provider.presence,
        data_provider_updated_on: community.data_provider_updated_on,
        time_zone: community.time_zone,
        move_to_production: community.move_to_production.present?,
        updated_at: community.updated_at
      }
    end

    private

      attr_reader :community, :unit_counts

      def unit_count
        count = community.number_of_units.to_i
        count.positive? ? count : unit_counts[community.id].to_i
      end

      # The CMS records the lifecycle as a set of dates, one per milestone.
      # The most advanced milestone that has a date wins.
      def stage
        return 'released' if community.released_date.present?
        return 'approval' if community.submitted_final_approval_date.present?
        return 'production' if community.production_started_date.present?
        return 'activated' if community.date_activated.present?

        'installed'
      end

      def products
        {
          touch: community.touchscreen_app.present? || product_option_enabled?('pynwheel_touch'),
          tour: community.self_tour.present? || product_option_enabled?('self_tour'),
          maps: product_options.dig('product_options', 'pynwheel_maps').present? ||
                community.enable_sdk_map.present?
        }
      end

      def integrations
        {
          lock: lock_state,
          identity: identity_state,
          pms: pms_state
        }
      end

      def lock_state
        return 'neutral' unless community.enable_locks.present?

        has_provider = community.locks_provider.present? ||
                       Array(community.multiple_locks_provider).compact_blank.any?
        has_provider ? 'ok' : 'warn'
      end

      def identity_state
        tour = community.tour
        return 'neutral' if tour.blank?

        tour.visual_id_verification.present? ? 'ok' : 'neutral'
      end

      def pms_state
        return 'neutral' if community.data_provider.blank?

        community.credential.present? ? 'ok' : 'warn'
      end

      def tour_published?
        community.tour.present? && community.tour.tour_stops.size.positive?
      end

      def product_option_enabled?(key)
        product_options.dig('product_options', key, 'is_enabled').present?
      end

      # `product_options` is a jsonb column that holds a JSON *string*
      # (the v2 API writes `params[:product_options].to_json` into it).
      def product_options
        @product_options ||= begin
          raw = community.product_options
          raw = JSON.parse(raw) if raw.is_a?(String)
          raw.is_a?(Hash) ? raw : {}
        rescue JSON::ParserError
          {}
        end
      end
  end
end
