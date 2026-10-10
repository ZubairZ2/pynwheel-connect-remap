# Paging for the server-side filtered grids, shared so the rows-per-page
# control means the same thing wherever one appears.
module GridPagination
  extend ActiveSupport::Concern

  PER_PAGE = 50
  PER_PAGE_OPTIONS = [25, 50, 100, 200].freeze

  # "All" is still bounded. Pagination exists because rendering every row was
  # what made these pages megabytes of HTML, so the escape hatch gets a ceiling
  # rather than an unbounded page - comfortably above the largest set today, and
  # the view says so when one is actually clipped.
  MAX_PER_PAGE = 2000

  included do
    helper_method :per_page, :showing_all?, :per_page_capped?
  end

  private

  # Pages one grid's results. Takes the scope separately from the filter so a
  # caller can add the eager loading its columns need without the filter object
  # having to know about display concerns.
  def paginate_grid(scope, filter)
    scope.paginate(page: params[:page], per_page: resolve_per_page(filter))
  end

  def per_page
    @per_page
  end

  def showing_all?
    @showing_all
  end

  # True when "All" was asked for but the matching set is larger than the cap,
  # so the page is showing the first MAX_PER_PAGE of it rather than everything.
  def per_page_capped?
    @per_page_capped
  end

  # The rows-per-page choice sticks for the rest of the session, so someone who
  # works at 200 rows does not have to re-pick it on every visit. "All" is
  # deliberately not remembered - it is an escape hatch for one screenful of
  # work, and silently reloading 2000 rows on a later visit is not what anyone
  # asked for. A fresh session still starts at PER_PAGE.
  def resolve_per_page(filter)
    requested = params[:per_page].to_s

    if requested == "all"
      @showing_all = true
      total = filter.results.reorder(nil).count
      @per_page_capped = total > MAX_PER_PAGE
      @per_page = [[total, 1].max, MAX_PER_PAGE].min
    else
      @showing_all = false
      @per_page_capped = false
      @per_page = remembered_per_page(requested.to_i)
    end
  end

  # Remembered per grid, so choosing 200 on the units grid leaves the
  # properties list alone.
  def remembered_per_page(requested)
    key = :"#{controller_name}_per_page"

    if PER_PAGE_OPTIONS.include?(requested)
      session[key] = requested
      requested
    else
      stored = session[key].to_i
      PER_PAGE_OPTIONS.include?(stored) ? stored : PER_PAGE
    end
  end
end
