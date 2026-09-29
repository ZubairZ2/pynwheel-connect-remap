# Presentation for the properties list. Everything here turns a column - or two
# columns that only make sense read together - into the one thing an operator
# scanning the grid actually wants to see.
module HomeHelper
  # Where a property row leads. Visitor-detail users only ever want the tour
  # log; everyone else wants the property's settings, which is where this list
  # has always sent them.
  def community_row_path(community)
    return community_tour_users_path(community) if current_user.is_view_visitor_details_page?
    return edit_company_community_path(community.company, community) if community.company

    community_units_path(community)
  end

  # The company cell goes to the company's own settings for anyone allowed to
  # change them, and to that company's property list for everyone else, so the
  # link never lands a user on a page CanCan will refuse.
  def company_row_path(company)
    return edit_company_path(company) if can?(:update, company)

    company_communities_path(company)
  end

  # How the property is mapped. `is_sitemap` is the map-style radio on the
  # property form - one map of the whole site, or a plan per floor - and
  # `is_floor_level_map` is the separate switch that splits a sitemap property
  # by floor, so it reads as a note under the style rather than a style of its
  # own.
  def community_map_type(community)
    if community.is_sitemap?
      { label: "Sitemap", sub: ("Floor-level" if community.is_floor_level_map?) }
    else
      { label: "Floorplates", sub: nil }
    end
  end

  # The products themselves lead; the rest are map and billing options.
  ACCENTED_FEATURES = %w[touch self_tour access].freeze

  # How many badges a row shows before the rest collapse into a "+N". A property
  # with everything switched on would otherwise wrap its row to three lines and
  # push the columns beside it out of alignment.
  VISIBLE_FEATURES = 4

  def community_features(community)
    Community::FEATURES.filter_map do |key, feature|
      next unless community.public_send(feature[:column])

      feature.slice(:label, :title).merge(accent: ACCENTED_FEATURES.include?(key))
    end
  end

  # Which map views the property offers: "2D only", "3D only", or "2D + 3D"
  # with the view the map opens in marked. Takes the [views, opens_in] pair
  # CommunityFilterQuery.map_views_for resolved, so a row costs no query. A
  # property with no map uploaded yet gets no badge.
  def community_map_view_badge(views, opens_in)
    case views
    when "2d" then { label: "2D only", title: "Map views: 2D only", view: true }
    when "3d" then { label: "3D only", title: "Map views: 3D only", view: true }
    when "both"
      { label: "2D + 3D", opens_in: opens_in, view: true,
        title: "Map views: 2D and 3D, opens in #{opens_in.upcase}" }
    end
  end

  # The badges to draw, plus - when there are more than fit - one overflow badge
  # whose tooltip names the ones it stands for, so nothing is simply lost. The
  # map view badge always leads and is never folded into the "+N".
  def community_feature_badges(community, map_view = nil)
    view_badge = community_map_view_badge(*map_view)
    features = community_features(community)
    room = view_badge ? VISIBLE_FEATURES - 1 : VISIBLE_FEATURES

    if features.size > room
      rest = features.drop(room)
      features = features.first(room) +
        [{ label: "+#{rest.size}", title: rest.map { |f| f[:title] }.join(", "), accent: false }]
    end

    [view_badge, *features].compact
  end

  # `data_provider_updated_on` is a free-text string the sync services write,
  # holding either a timestamp or the literal "Never", so it is parsed rather
  # than trusted. An unparseable value is shown as-is - it is still more use to
  # whoever is debugging the feed than a blank cell.
  def community_sync_label(community)
    raw = community.data_provider_updated_on.to_s.strip
    return "Never synced" if raw.blank? || raw.casecmp("never").zero?

    synced_at = Time.zone.parse(raw) rescue nil
    synced_at ? "#{time_ago_in_words(synced_at)} ago" : raw
  end
end
