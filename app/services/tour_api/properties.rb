# frozen_string_literal: true

module TourApi
  # Properties (the CMS's communities) as the Tour App sees them: the list
  # the signed-in user may tour, one property's summary and detail, and the
  # two gates every property endpoint passes (exists + access → 404; the
  # Self-Guided Tour is on → 422 `tour_disabled`).
  module Properties
    LIST_TTL = 60.seconds

    # The whole list is remembered per process for a minute (803 rows); the
    # access filter runs per request on top of it.
    LIST_CACHE = ActiveSupport::Cache::MemoryStore.new(expires_in: LIST_TTL, size: 16.megabytes)

    module_function

    def summary(community, company_name: community.company&.name)
      {
        id: community.id,
        name: community.name.presence || "Property #{community.id}",
        address: community.address,
        city: community.city,
        state: community.state,
        zip: community.zip,
        company: company_name,
        tour_enabled: Connect::ProductState.tour?(community),
        is_sitemap: community.is_sitemap.present?
      }
    end

    # Only the columns the summary reads (a community row is wide), with the
    # company names looked up in one query.
    SUMMARY_COLUMNS = %i[id name address city state zip company_id is_sitemap self_tour product_options].freeze

    def all_summaries
      LIST_CACHE.fetch('all') do
        rows = Community.select(*SUMMARY_COLUMNS).order(Arel.sql('lower(communities.name), communities.id')).to_a
        companies = Company.where(id: rows.map(&:company_id).compact.uniq).pluck(:id, :name).to_h
        rows.map { |c| summary(c, company_name: companies[c.company_id]) }
      end
    end

    def reset_cache!
      LIST_CACHE.clear
    end

    # Staff: `User#can_access_community?` (a Super Admin, the only staff role
    # admitted, sees every property). A visitor (October 23, 2026): any
    # property whose Self-Guided Tour is on, unless the property restricts
    # access to an email allowlist (`communities.restrict_access` +
    # `allowed_emails`), as the legacy app's community list did.
    def accessible?(context, community_id, community: nil)
      return context.user.can_access_community?(community_id) if context.staff?

      community ||= Community.find_by(id: community_id)
      visitor_accessible?(context.visitor, community)
    end

    def visitor_accessible?(visitor, community)
      return false if community.nil? || !Connect::ProductState.tour?(community)
      return true unless community.restrict_access

      AllowedEmail.where(community_id: community.id).where('lower(email) = ?', visitor.email.to_s.downcase).exists?
    end

    def list(context, query: nil, tour_only: false)
      rows = if context.staff?
               all_summaries.select { |row| accessible?(context, row[:id]) }
             else
               restricted = Community.where(restrict_access: true).pluck(:id)
               allowed = AllowedEmail.where('lower(email) = ?', context.visitor.email.to_s.downcase).pluck(:community_id)
               all_summaries.select { |row| row[:tour_enabled] && (!restricted.include?(row[:id]) || allowed.include?(row[:id])) }
             end
      rows = rows.select { |row| row[:tour_enabled] } if tour_only
      if query.present?
        q = query.strip.downcase
        rows = rows.select { |row| [row[:name], row[:city], row[:address]].any? { |value| value.to_s.downcase.include?(q) } }
      end
      rows
    end

    # The property, when the id is well-formed, it exists and the signed-in
    # user may see it. A property the user may not see is indistinguishable
    # from one that does not exist.
    def find!(context, raw_id)
      id = raw_id.to_s
      unless id.match?(/\A\d+\z/)
        raise ApiError.validation([{ loc: %w[path property_id], message: 'Input should be a valid integer, unable to parse string as an integer' }])
      end
      raise ApiError.validation([{ loc: %w[path property_id], message: 'Input should be greater than or equal to 1' }]) if id.to_i < 1

      community = Community.includes(:company).find_by(id: id.to_i)
      raise ApiError.not_found if community.nil? || !accessible?(context, community.id, community: community)

      community
    end

    def require_tour!(community)
      raise ApiError.unprocessable('tour_disabled', 'This property has no Self-Guided Tour.') unless Connect::ProductState.tour?(community)

      community
    end

    def counts(community)
      {
        floorplates: Floorplate.where(community_id: community.id).count,
        units: Unit.where(community_id: community.id, visible: true).count,
        amenities: Amenity.where(community_id: community.id, amenityable_type: %w[Floorplate Sitemap]).count
      }
    end

    # `built` and `stops` are given when the tour is on (the graph and the stops list).
    def detail(community, built: nil, stops: nil)
      base = summary(community)
      tour = nil
      buildings = []
      version = nil
      if base[:tour_enabled] && built
        version = built.version
        buildings = built.graph.buildings.dup
        main = built.graph.tour
        if main
          tour = { id: main.id, start_node: stops[:start_node], starting_floor: main.starting_floor, building: main.building.presence,
                   building_order: Array(main.building_order), stops_total: stops[:total] }
        end
      end
      c = counts(community)
      # October 25, 2026: `config_version` covers the graph, the stops and the booking rules; the app compares it on resume.
      config_version = base[:tour_enabled] && built ? ConfigVersion.for(community) : nil
      base.merge(success: true, auto_wayfinding: community.auto_wayfinding.present?, floorplates_count: c[:floorplates], units_count: c[:units],
                 amenities_count: c[:amenities], buildings: buildings, tour: tour, graph_version: version, config_version: config_version,
                 published_at: Text.timestamp(community.community_tour&.tour_published_at),
                 # The leasing office's contact (October 21, 2026): the property's phone and email as the CMS holds them, null when it holds none.
                 phone: Text.presence(community.phone) || Text.presence(community.property_manager_phone),
                 email: Text.presence(community.email))
    end
  end
end
