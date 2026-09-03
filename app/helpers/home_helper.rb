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

  # `locked` and `move_to_production` are two booleans describing one thing:
  # where the property is in its life cycle. The grid shows the answer, not the
  # flags, and the Status filter narrows on exactly the same three cases.
  def community_status(community)
    if community.locked?
      { label: "Locked", tone: "bad" }
    elsif community.move_to_production?
      { label: "Live", tone: "yes" }
    else
      { label: "In setup", tone: "warn" }
    end
  end

  # The product switches this property has on, in the order Community::FEATURES
  # declares them so a column of badges reads the same way on every row. The
  # first two are the products themselves rather than map options, so they lead.
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

  # The badges to draw, plus - when there are more than fit - one overflow badge
  # whose tooltip names the ones it stands for, so nothing is simply lost.
  def community_feature_badges(community)
    features = community_features(community)
    return features if features.size <= VISIBLE_FEATURES

    shown = features.first(VISIBLE_FEATURES)
    rest = features.drop(VISIBLE_FEATURES)
    shown + [{ label: "+#{rest.size}", title: rest.map { |f| f[:title] }.join(", "), accent: false }]
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
