module Connect
  # One page of a relation, plus the metadata the frontend needs to render a
  # pager. Uses will_paginate, the pagination this app already standardises on
  # (see SvgOptimizerController, PartnerConfigurationsController).
  #
  # Paging happens in SQL: only the page's rows are ever loaded or serialized.
  class PaginatedCollection
    DEFAULT_PER_PAGE = 10
    MAX_PER_PAGE = 100

    def initialize(scope, page:, per_page: nil)
      @per_page = sanitize_per_page(per_page)
      @records = scope.paginate(page: sanitize_page(page), per_page: @per_page)

      # A page past the end (a stale bookmark, or the last row of the last page
      # being deleted) would otherwise render an empty table with no way back.
      @records = scope.paginate(page: @records.total_pages, per_page: @per_page) if past_the_end?
    end

    attr_reader :records

    def meta
      {
        # `current_page` is a WillPaginate::PageNumber, which serializes as
        # "page 1" rather than 1 — the frontend needs the integer.
        page: records.current_page.to_i,
        per_page: records.per_page.to_i,
        total_count: records.total_entries.to_i,
        total_pages: records.total_pages.to_i
      }
    end

    def total_count
      records.total_entries
    end

    private

      def past_the_end?
        @records.total_pages.positive? && @records.current_page > @records.total_pages
      end

      def sanitize_page(value)
        page = value.to_i
        page.positive? ? page : 1
      end

      def sanitize_per_page(value)
        per_page = value.to_i
        return DEFAULT_PER_PAGE unless per_page.positive?

        [per_page, MAX_PER_PAGE].min
      end
  end
end
