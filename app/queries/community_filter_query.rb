# Server-side filtering, sorting and paging for the properties grid.
#
# The list used to render every community the user can reach into a single
# DataTable with paging switched off, so a super admin's home page built - and
# shipped - the entire estate on every visit just to offer a text search over
# it. Everything the toolbar offers is resolved in SQL here instead, so a page
# costs one bounded query however large the estate grows.
#
# The scope handed in is already narrowed to what this user may see; this class
# only ever narrows it further, and never widens it.
class CommunityFilterQuery < FilterQuery
  # The company name is both searchable and sortable, so it is joined for every
  # request rather than conditionally. LEFT, because a community with no company
  # must not silently vanish from the list.
  COMPANY_JOIN = "LEFT JOIN companies ON companies.id = communities.company_id".freeze

  # Live unit count. The `number_of_units` column is a hand-entered marketing
  # figure that nothing keeps in step with the data feed, so the grid counts for
  # real - as a scalar subquery, which stays one query whether it is used for
  # sorting, filtering or both.
  UNIT_COUNT = "(SELECT COUNT(*) FROM units WHERE units.community_id = communities.id)".freeze

  # Property names are routinely stored with a leading article, and Dwelo
  # properties with a leading tag, so plain alphabetical ordering scatters them
  # under T and D. Stripping both reproduces the ordering the list has always
  # shown, in SQL rather than by sorting an array of every row in Ruby.
  NATURAL_NAME = "regexp_replace(lower(communities.name), '^(the|\\(dwelo\\))\\s+', '')".freeze

  # "Never" is the literal the sync services write when a property has never
  # pulled from its provider, so an empty string counts as never too.
  NEVER_SYNCED = "(communities.data_provider_updated_on IS NULL OR communities.data_provider_updated_on IN ('', 'Never'))".freeze

  SORTS = {
    "name" => "#{NATURAL_NAME} %<dir>s NULLS LAST",
    "company" => "lower(companies.name) %<dir>s NULLS LAST, #{NATURAL_NAME} ASC",
    "location" => "communities.state %<dir>s NULLS LAST, communities.city %<dir>s NULLS LAST",
    "units" => "#{UNIT_COUNT} %<dir>s",
    "provider" => "communities.data_provider %<dir>s NULLS LAST, #{NATURAL_NAME} ASC",
    "created_at" => "communities.created_at %<dir>s NULLS LAST"
  }.freeze

  DEFAULT_SORT = "name".freeze

  FILTER_KEYS = %i[
    q company_id region_id community_group_id state data_provider
    status product map_type synced min_units max_units
  ].freeze

  # Which map a property renders. Mutually exclusive as far as the operator
  # cares, and each is a different column, so they share one dropdown.
  MAP_TYPES = {
    "sdk" => "communities.enable_sdk_map IS TRUE",
    "svg" => "communities.enable_svg_mode IS TRUE",
    "three_d" => "communities.enable_three_d_maps IS TRUE",
    "sitemap" => "communities.is_sitemap IS TRUE",
    "floor_level" => "communities.is_floor_level_map IS TRUE"
  }.freeze

  # `locked` and `move_to_production` between them describe where a property is
  # in its life cycle; the grid states that as one column and filters it as one
  # dropdown rather than making an operator read two booleans.
  STATUSES = {
    "live" => "communities.locked IS NOT TRUE AND communities.move_to_production IS TRUE",
    "setup" => "communities.locked IS NOT TRUE AND communities.move_to_production IS NOT TRUE",
    "locked" => "communities.locked IS TRUE"
  }.freeze

  private

  def base_scope
    scope.joins(COMPANY_JOIN)
  end

  def apply_filters(relation)
    relation = apply_search(relation)
    relation = apply_association(relation, :company_id, "communities.company_id")
    relation = apply_association(relation, :region_id, "communities.region_id")
    relation = apply_association(relation, :community_group_id, "communities.community_group_id")
    relation = apply_exact(relation, :state, "communities.state", blank_sql: "communities.state IS NULL OR communities.state = ''")
    relation = apply_exact(relation, :data_provider, "communities.data_provider", blank_sql: "communities.data_provider IS NULL OR communities.data_provider = ''")
    relation = apply_lookup(relation, :status, STATUSES)
    relation = apply_lookup(relation, :map_type, MAP_TYPES)
    relation = apply_product(relation)
    relation = apply_synced(relation)
    apply_range(relation, UNIT_COUNT, params[:min_units], params[:max_units])
  end

  # One box over everything an operator would recognise a property by: its own
  # name, the code and address they were given, and the company it sits under.
  def apply_search(relation)
    term = params[:q].to_s.strip
    return relation if term.blank?

    relation.where(
      "communities.name ILIKE :like ESCAPE '\\' OR communities.code ILIKE :like ESCAPE '\\' " \
      "OR communities.city ILIKE :like ESCAPE '\\' OR communities.state ILIKE :like ESCAPE '\\' " \
      "OR communities.address ILIKE :like ESCAPE '\\' OR companies.name ILIKE :like ESCAPE '\\'",
      like: like(term)
    )
  end

  # A foreign key, or the properties that have not been given one at all.
  def apply_association(relation, key, column)
    value = params[key].to_s
    return relation if value.blank?
    return relation.where("#{column} IS NULL") if value == NONE

    relation.where("#{column} = ?", value.to_i)
  end

  # A dropdown whose values name a predicate rather than carrying one. An
  # unrecognised value narrows to nothing rather than being ignored, so a
  # hand-edited URL can't quietly return the unfiltered list.
  def apply_lookup(relation, key, table)
    value = params[key].to_s
    return relation if value.blank?

    table.key?(value) ? relation.where(table[value]) : relation.none
  end

  def apply_product(relation)
    value = params[:product].to_s
    return relation if value.blank?

    feature = Community::FEATURES[value]
    return relation.none if feature.blank?

    relation.where("communities.#{feature[:column]} IS TRUE")
  end

  def apply_synced(relation)
    case params[:synced].to_s
    when "true" then relation.where("NOT #{NEVER_SYNCED}")
    when "false" then relation.where(NEVER_SYNCED)
    else relation
    end
  end
end
