# Shared machinery behind every server-side filtered grid in the CMS.
#
# A grid subclasses this, declares FILTER_KEYS and SORTS, and implements
# #base_scope plus one small apply_* method per filter. Everything the toolbar,
# the sortable headers and the pager need in common - which sort is active,
# which filters have to ride along on every link, how a LIKE term is escaped -
# lives here, so adding a grid is a query object and a table partial rather
# than another copy of this file.
class FilterQuery
  # A filter value meaning "this field is empty" rather than a real value.
  NONE = "none".freeze

  attr_reader :params

  def initialize(scope, params = {})
    @scope = scope
    @params = params || {}
  end

  # The filtered, sorted relation - deliberately not paginated, so a caller can
  # either page it for display or resolve the whole matching set for a bulk
  # action against exactly the same definition of "matching".
  def results
    apply_filters(base_scope).order(Arel.sql(order_clause))
  end

  # True when the toolbar is narrowing the list at all, so the view can decide
  # whether to offer a "Clear" affordance.
  def filtering?
    self.class::FILTER_KEYS.any? { |key| params[key].present? }
  end

  def sort_key
    self.class::SORTS.key?(params[:sort]) ? params[:sort] : self.class::DEFAULT_SORT
  end

  def sort_dir
    params[:dir].to_s.casecmp("desc").zero? ? "desc" : "asc"
  end

  # Query-string fragment that every pagination link and sortable header has to
  # carry so paging and sorting don't silently drop the active filters.
  def to_query_params
    (self.class::FILTER_KEYS + %i[sort dir per_page]).each_with_object({}) do |key, acc|
      value = params[key]
      acc[key] = value if value.present?
    end
  end

  private

  attr_reader :scope

  # The unfiltered relation the grid draws from. Override to add the joins the
  # filters and sorts need.
  def base_scope
    scope
  end

  # Runs every apply_* the grid defines. Subclass responsibility.
  def apply_filters(_relation)
    raise NotImplementedError, "#{self.class} must implement #apply_filters"
  end

  def order_clause
    format(self.class::SORTS[sort_key], dir: sort_dir.upcase)
  end

  # A tri-state boolean filter: on, off, or not in play at all.
  def apply_flag(relation, key, table:, column: key)
    case params[key].to_s
    when "true" then relation.where("#{table}.#{column} IS TRUE")
    when "false" then relation.where("#{table}.#{column} IS NOT TRUE")
    else relation
    end
  end

  # A min/max pair over any numeric expression. The bound is cast rather than
  # left for Postgres to infer: it infers the *column's* type, so "10.0" against
  # a bigint expression - a COUNT(*) subquery, say - is rejected outright.
  # Casting the value keeps the column side untouched, so an index on it can
  # still be used.
  def apply_range(relation, column, min, max)
    relation = relation.where("#{column} >= ?::numeric", min.to_f) if min.present?
    relation = relation.where("#{column} <= ?::numeric", max.to_f) if max.present?
    relation
  end

  # A plain equality filter that also understands "the column is empty".
  def apply_exact(relation, key, column, blank_sql:)
    value = params[key].to_s
    return relation if value.blank?
    return relation.where(blank_sql) if value == NONE

    relation.where("#{column} = ?", value)
  end

  # ILIKE treats % and _ as wildcards, so a search for "10_A" would otherwise
  # match "10-A". Pairs with the ESCAPE '\' each search clause carries.
  def like(term)
    "%#{escape_like(term)}%"
  end

  # The escaping on its own, for a grid that builds its own pattern around it.
  def escape_like(term)
    term.gsub(/[\\%_]/) { |char| "\\#{char}" }
  end
end
