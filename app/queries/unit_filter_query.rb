# Server-side filtering, sorting and paging for the units grid.
#
# The grid used to ship every unit of the property to the browser and let
# DataTables do the work, which is why the page grew to megabytes on a large
# property. Everything the toolbar offers is resolved in SQL here instead, so a
# page costs one bounded query no matter how many units the property has.
#
# Bedrooms/bathrooms live on the floor plan, not the unit, and units reference
# their floor plan by `provider_floorplan_id` rather than by primary key - so
# every scope that reaches for floor plan data goes through #with_floorplans.
class UnitFilterQuery
  # `units.floorplan_id` holds a provider id, not a floorplans.id, so this is the
  # only correct way to reach a unit's floor plan. Scoped to the same community
  # because provider ids are only unique within one.
  FLOORPLAN_JOIN = <<~SQL.squish.freeze
    LEFT JOIN floorplans
      ON floorplans.provider_floorplan_id = units.floorplan_id
     AND floorplans.community_id = units.community_id
  SQL

  # Only joined when the lock filter is actually in play - most page loads have
  # no business paying for it. A unit has at most one door, so this cannot
  # duplicate rows.
  DOOR_JOIN = <<~SQL.squish.freeze
    LEFT JOIN doors
      ON doors.attached_with_type = 'Unit'
     AND doors.attached_with_id = units.id
  SQL

  # A door's provider wins over the unit's own column, matching what the grid's
  # lock cell renders.
  EFFECTIVE_LOCK = "COALESCE(NULLIF(doors.lock_provider, ''), NULLIF(units.lock_provider, ''))".freeze

  # Unit names are things like "103-B", so plain alphabetical ordering puts
  # "1000" before "99". Sorting on the first number in the name first, with the
  # whole name as the tie-break, reproduces the natural order the grid used to
  # get from Ruby-side zero padding. Capped at 9 digits so a pathological name
  # can't overflow the cast.
  NATURAL_NAME = "NULLIF(substring(units.marketing_name from '(\\d{1,9})'), '')::bigint".freeze

  # A unit's own square footage wins when it has one; otherwise the floor plan's
  # is what the app displays, so that is what the filter and the column sort on.
  EFFECTIVE_SQFT = "COALESCE(NULLIF(units.square_feet, 0), floorplans.square_feet)".freeze

  SORTS = {
    "name" => "#{NATURAL_NAME} %<dir>s NULLS LAST, units.marketing_name %<dir>s",
    "floorplan" => "floorplans.name %<dir>s NULLS LAST",
    "price" => "units.effective_rent %<dir>s NULLS LAST",
    "available_date" => "units.available_date %<dir>s NULLS LAST",
    "floor" => "units.floor %<dir>s NULLS LAST",
    "building" => "units.building %<dir>s NULLS LAST",
    "sqft" => "#{EFFECTIVE_SQFT} %<dir>s NULLS LAST",
    "bedrooms" => "floorplans.bedrooms %<dir>s NULLS LAST"
  }.freeze

  DEFAULT_SORT = "name".freeze

  # The search box matches the unit name and nothing else. Building, floor plan,
  # beds and the rest each have their own dropdown, so folding them into the text
  # search only ever widened a result set someone was trying to narrow - a
  # provider id that happened to contain "243" would surface as a unit 243.
  SEARCH_COLUMN = "units.marketing_name".freeze

  MAX_SEARCH_TERMS = 40

  # Filter values that mean "the field is empty" rather than a real value.
  NONE = "none".freeze

  attr_reader :community, :params

  def initialize(community, params = {})
    @community = community
    @params = params || {}
  end

  # The filtered, sorted relation - not paginated, so callers can either page it
  # for the grid or pluck the whole matching set for a bulk action.
  def results
    scope = with_floorplans(community.units)
    scope = apply_search(scope)
    scope = apply_floorplan(scope)
    scope = apply_bedrooms(scope)
    scope = apply_bathrooms(scope)
    scope = apply_availability(scope)
    scope = apply_flag(scope, :sold)
    scope = apply_flag(scope, :manual_override)
    scope = apply_floor(scope)
    scope = apply_building(scope)
    scope = apply_range(scope, "units.effective_rent", params[:min_price], params[:max_price])
    scope = apply_range(scope, EFFECTIVE_SQFT, params[:min_sqft], params[:max_sqft])
    scope = apply_plotted(scope)
    scope = apply_overridden_field(scope)
    scope = apply_lock(scope)
    scope.order(Arel.sql(order_clause))
  end

  # True when the toolbar is narrowing the list at all, so the view can decide
  # whether to offer a "Clear" affordance.
  def filtering?
    FILTER_KEYS.any? { |key| params[key].present? }
  end

  FILTER_KEYS = %i[
    q floorplan bedrooms bathrooms availability sold manual_override
    floor building min_price max_price min_sqft max_sqft plotted overridden_field lock
  ].freeze

  def sort_key
    SORTS.key?(params[:sort]) ? params[:sort] : DEFAULT_SORT
  end

  def sort_dir
    params[:dir].to_s.casecmp("desc").zero? ? "desc" : "asc"
  end

  # Query-string fragment that every pagination link and sortable header has to
  # carry so paging and sorting don't silently drop the active filters.
  def to_query_params
    (FILTER_KEYS + %i[sort dir per_page]).each_with_object({}) do |key, acc|
      value = params[key]
      acc[key] = value if value.present?
    end
  end

  private

  def with_floorplans(scope)
    scope.joins(FLOORPLAN_JOIN)
  end

  # Search accepts a list, not just one string. "1-201, 1-202" finds both units,
  # so a set copied out of a spreadsheet can be pulled up in one go and acted on
  # together - the alternative was ticking them one at a time.
  #
  # A "*" is an explicit wildcard: "1-2*" is every unit whose name starts with
  # "1-2", which is how you ask for one building's second floor. Plain substring
  # matching cannot express that, which is why searching "1-2" also drags in
  # 11-2xx and anything else containing the pair.
  def apply_search(scope)
    terms = search_terms
    return scope if terms.empty?

    binds = {}
    clauses = terms.each_with_index.map do |term, index|
      key = :"q#{index}"
      binds[key] = search_pattern(term)
      "#{SEARCH_COLUMN} ILIKE :#{key} ESCAPE '\\'"
    end

    scope.where(clauses.join(" OR "), binds)
  end

  # Commas and newlines separate list items; a space does not, so a name that
  # contains one stays a single phrase. Bounded so a pasted wall of text cannot
  # turn into an unbounded pile of OR clauses.
  def search_terms
    params[:q].to_s.split(/[,\n\r]+/).map(&:strip).reject(&:blank?).uniq.first(MAX_SEARCH_TERMS)
  end

  # Without a "*" the term keeps the old substring behaviour, so nothing that
  # used to match stops matching.
  def search_pattern(term)
    escaped = sanitize_like(term)
    term.include?("*") ? escaped.tr("*", "%") : "%#{escaped}%"
  end

  def apply_floorplan(scope)
    value = params[:floorplan].to_s
    return scope if value.blank?
    return scope.where("units.floorplan_id IS NULL OR units.floorplan_id = ''") if value == NONE

    scope.where(units: { floorplan_id: value })
  end

  def apply_bedrooms(scope)
    value = params[:bedrooms].to_s
    return scope if value.blank?

    # bedrooms is a string column holding a number, so compare numerically -
    # otherwise "2" and "2.0" from different providers wouldn't match each other.
    scope.where("NULLIF(floorplans.bedrooms, '')::numeric = ?", value.to_f)
  end

  def apply_bathrooms(scope)
    value = params[:bathrooms].to_s
    return scope if value.blank?

    scope.where("floorplans.bathrooms = ?", value.to_f)
  end

  # "Available" on the grid is the boolean flag, which is what the app filters
  # renters by; "now" additionally requires the date to have arrived.
  def apply_availability(scope)
    case params[:availability].to_s
    when "true" then scope.where(units: { available: true })
    when "false" then scope.where("units.available IS NOT TRUE")
    when "now" then scope.where("units.available IS TRUE AND (units.available_date IS NULL OR units.available_date <= ?)", Date.current)
    when "upcoming" then scope.where("units.available IS TRUE AND units.available_date > ?", Date.current)
    else scope
    end
  end

  def apply_flag(scope, column)
    case params[column].to_s
    when "true" then scope.where(units: { column => true })
    when "false" then scope.where("units.#{column} IS NOT TRUE")
    else scope
    end
  end

  def apply_floor(scope)
    value = params[:floor].to_s
    return scope if value.blank?
    return scope.where(units: { floor: nil }) if value == NONE

    scope.where(units: { floor: value.to_i })
  end

  def apply_building(scope)
    value = params[:building].to_s
    return scope if value.blank?
    return scope.where("units.building IS NULL OR units.building = ''") if value == NONE

    scope.where(units: { building: value })
  end

  def apply_range(scope, column, min, max)
    scope = scope.where("#{column} >= ?", min.to_f) if min.present?
    scope = scope.where("#{column} <= ?", max.to_f) if max.present?
    scope
  end

  # Plotted means the unit has a position on the map - either legacy x/y
  # coordinates or an SVG pointer, matching how Unit#svg_pointed treats them.
  def apply_plotted(scope)
    plotted_sql = "(units.x_plot > 0 OR units.y_plot > 0 OR (units.pointer_data->>'x_plot') IS NOT NULL)"

    case params[:plotted].to_s
    when "true" then scope.where(plotted_sql)
    when "false" then scope.where("NOT #{plotted_sql}")
    else scope
    end
  end

  def apply_lock(scope)
    value = params[:lock].to_s
    return scope if value.blank?

    scope = scope.joins(DOOR_JOIN)
    return scope.where("#{EFFECTIVE_LOCK} IS NULL") if value == NONE
    return scope.where("#{EFFECTIVE_LOCK} IS NOT NULL") if value == "any"

    scope.where("#{EFFECTIVE_LOCK} = ?", value)
  end

  # Narrows to units carrying a per-field "set by hand" marker - either a
  # specific one, or any of them. This is how you find the units whose Price (or
  # name, or floor) the data feed has stopped updating, so the flag can be
  # cleared in bulk.
  def apply_overridden_field(scope)
    value = params[:overridden_field].to_s
    return scope if value.blank?

    if value == "any"
      clauses = Unit::FEED_OVERRIDE_COLUMNS.map { |column| "units.#{column} IS TRUE" }
      return scope.where(clauses.join(" OR "))
    end

    flag = Unit::FEED_OVERRIDE_FLAGS[value]
    return scope if flag.blank?

    scope.where("units.#{flag[:column]} IS TRUE")
  end

  def order_clause
    format(SORTS[sort_key], dir: sort_dir.upcase)
  end

  # ILIKE treats % and _ as wildcards, so a search for "10_A" would otherwise
  # match "10-A". The ESCAPE '\' on each clause pairs with this.
  def sanitize_like(term)
    term.gsub(/[\\%_]/) { |char| "\\#{char}" }
  end
end
