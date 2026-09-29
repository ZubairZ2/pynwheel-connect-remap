# View-side plumbing shared by the filtered grids. Everything here is grid
# agnostic - it reads the request and the @filter the controller set up, so a
# new grid gets working sort headers, pager links and toolbar selects without
# adding a helper of its own.
module PynGridHelper
  # A link back to this grid with the current filters preserved and only the
  # given keys changed - what every sort header, pager link and rows-per-page
  # control needs so it can't drop the filter set out from under the user.
  # Built off request.path rather than a named route so it works unchanged on
  # any grid, including the XHR that re-renders one.
  def grid_path(overrides = {})
    query = @filter.to_query_params.merge(page: params[:page]).merge(overrides).compact_blank
    query.any? ? "#{request.path}?#{query.to_query}" : request.path
  end

  # One of the toolbar's selects, with the active choice marked.
  def grid_filter_select(name, choices, placeholder)
    select_tag name,
               options_for_select(choices, params[name].to_s),
               include_blank: placeholder,
               class: "f-select",
               id: "filter-#{name}"
  end

  # A "min - max" pair of number inputs, which every grid has at least one of.
  def grid_range_filter(label, min_key, max_key)
    render "shared/grid_range_filter", label: label, min_key: min_key, max_key: max_key
  end
end
