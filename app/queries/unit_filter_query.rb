# Server-side filtering, sorting and paging for the units grid.
#
# The grid used to ship every unit of the property to the browser and let
# DataTables do the work, which is why the page grew to megabytes on a large
# property. Everything the toolbar offers is resolved in SQL here instead, so a
# page costs one bounded query no matter how many units the property has.
#
# Bedrooms/bathrooms live on the floor plan, not the unit, and units reference
# their floor plan by `provider_floorplan_id` rather than by primary key - so
# every scope that reaches for floor plan data goes through #base_scope's join.
class UnitFilterQuery < FilterQuery
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

  FILTER_KEYS = %i[
    q floorplan bedrooms bathrooms availability sold manual_override
    floor building min_price max_price min_sqft max_sqft plotted overridden_field lock
  ].freeze

  attr_reader :community

  def initialize(community, params = {})
    @community = community
    super(community.units, params)
  end

  private

  def base_scope
    scope.joins(FLOORPLAN_JOIN)
  end

  def apply_filters(relation)
    relation = apply_search(relation)
    relation = apply_floorplan(relation)
    relation = apply_bedrooms(relation)
    relation = apply_bathrooms(relation)
    relation = apply_availability(relation)
    relation = apply_flag(relation, :sold, table: "units")
    relation = apply_flag(relation, :manual_override, table: "units")
    relation = apply_floor(relation)
    relation = apply_exact(relation, :building, "units.building", blank_sql: "units.building IS NULL OR units.building = ''")
    relation = apply_range(relation, "units.effective_rent", params[:min_price], params[:max_price])
    relation = apply_range(relation, EFFECTIVE_SQFT, params[:min_sqft], params[:max_sqft])
    relation = apply_plotted(relation)
    relation = apply_overridden_field(relation)
    apply_lock(relation)
  end

  def apply_search(relation)
    term = params[:q].to_s.strip
    return relation if term.blank?

    relation.where(
      "units.marketing_name ILIKE :like ESCAPE '\\' OR units.building ILIKE :like ESCAPE '\\' " \
      "OR units.provider_unit_id ILIKE :like ESCAPE '\\' OR floorplans.name ILIKE :like ESCAPE '\\'",
      like: like(term)
    )
  end

  def apply_floorplan(relation)
    apply_exact(relation, :floorplan, "units.floorplan_id",
                blank_sql: "units.floorplan_id IS NULL OR units.floorplan_id = ''")
  end

  def apply_bedrooms(relation)
    value = params[:bedrooms].to_s
    return relation if value.blank?

    # bedrooms is a string column holding a number, so compare numerically -
    # otherwise "2" and "2.0" from different providers wouldn't match each other.
    relation.where("NULLIF(floorplans.bedrooms, '')::numeric = ?", value.to_f)
  end

  def apply_bathrooms(relation)
    value = params[:bathrooms].to_s
    return relation if value.blank?

    relation.where("floorplans.bathrooms = ?", value.to_f)
  end

  # "Available" on the grid is the boolean flag, which is what the app filters
  # renters by; "now" additionally requires the date to have arrived.
  def apply_availability(relation)
    case params[:availability].to_s
    when "true" then relation.where(units: { available: true })
    when "false" then relation.where("units.available IS NOT TRUE")
    when "now" then relation.where("units.available IS TRUE AND (units.available_date IS NULL OR units.available_date <= ?)", Date.current)
    when "upcoming" then relation.where("units.available IS TRUE AND units.available_date > ?", Date.current)
    else relation
    end
  end

  def apply_floor(relation)
    value = params[:floor].to_s
    return relation if value.blank?
    return relation.where(units: { floor: nil }) if value == NONE

    relation.where(units: { floor: value.to_i })
  end

  # Plotted means the unit has a position on the map - either legacy x/y
  # coordinates or an SVG pointer, matching how Unit#svg_pointed treats them.
  def apply_plotted(relation)
    plotted_sql = "(units.x_plot > 0 OR units.y_plot > 0 OR (units.pointer_data->>'x_plot') IS NOT NULL)"

    case params[:plotted].to_s
    when "true" then relation.where(plotted_sql)
    when "false" then relation.where("NOT #{plotted_sql}")
    else relation
    end
  end

  def apply_lock(relation)
    value = params[:lock].to_s
    return relation if value.blank?

    relation = relation.joins(DOOR_JOIN)
    return relation.where("#{EFFECTIVE_LOCK} IS NULL") if value == NONE
    return relation.where("#{EFFECTIVE_LOCK} IS NOT NULL") if value == "any"

    relation.where("#{EFFECTIVE_LOCK} = ?", value)
  end

  # Narrows to units carrying a per-field "set by hand" marker - either a
  # specific one, or any of them. This is how you find the units whose Price (or
  # name, or floor) the data feed has stopped updating, so the flag can be
  # cleared in bulk.
  def apply_overridden_field(relation)
    value = params[:overridden_field].to_s
    return relation if value.blank?

    if value == "any"
      clauses = Unit::FEED_OVERRIDE_COLUMNS.map { |column| "units.#{column} IS TRUE" }
      return relation.where(clauses.join(" OR "))
    end

    flag = Unit::FEED_OVERRIDE_FLAGS[value]
    return relation if flag.blank?

    relation.where("units.#{flag[:column]} IS TRUE")
  end
end
