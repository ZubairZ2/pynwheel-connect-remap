module Connect
  # The Pynwheel Connect Units tab, one page at a time.
  #
  # The tab used to receive every unit of the property and search, filter and
  # page it in the browser. This resolves the same toolbar in SQL, on top of
  # UnitFilterQuery — the legacy grid's query object, which contributes the
  # floor plan join, the search (`q`), the price and square-foot ranges and the
  # natural name order — and pages the result through Connect::PaginatedCollection,
  # so a page costs one bounded query however many units the property has.
  #
  # The tab's own filters are multi-select (OR within a filter, AND across),
  # which UnitFilterQuery's single-value params cannot express, so they are
  # applied here, with the semantics the tab already had in the browser:
  #
  #   floorplan     floor plan ids (`floorplans.id`), or `none` (no floor plan resolves)
  #   availability  now / soon / notAvailable / sold, in that precedence (sold wins)
  #   building      building names, or `none`
  #   floor         floor numbers, or `none`
  #   state         plotted / unplotted / model / manual / noPhotos
  #   beds, baths   the floor plan's bedroom / bathroom counts
  #   ids           unit ids (Unit Detail reads its one unit as a page of one)
  #
  # `today` (yyyy-mm-dd) is the day "available now" is measured against — the
  # CMS's own today unless the caller names the one it rendered with.
  #
  # Read-only: nothing here writes, and UnitFilterQuery is used as it is.
  class UnitListingQuery
    DEFAULT_PER_PAGE = 25
    NONE = 'none'.freeze

    # The params UnitFilterQuery already understands, handed to it as they are.
    PASS_THROUGH = %i[q min_price max_price min_sqft max_sqft sort dir].freeze

    PLOTTED_SQL = "(units.x_plot > 0 OR units.y_plot > 0 OR (units.pointer_data->>'x_plot') IS NOT NULL)".freeze
    MANUAL_SQL = (['units.manual_override IS TRUE'] + Unit::FEED_OVERRIDE_COLUMNS.map { |column| "units.#{column} IS TRUE" })
                 .join(' OR ').freeze
    # A unit has photos when it has its own image (the stored file or its S3
    # copy) or an interior image (an Amenity owned by the unit).
    NO_PHOTOS_SQL = "(COALESCE(units.image, '') = '' AND COALESCE(units.standard_image_url, '') = '' " \
                    "AND NOT EXISTS (SELECT 1 FROM amenities WHERE amenities.amenityable_type = 'Unit' " \
                    'AND amenities.amenityable_id = units.id))'.freeze
    STATE_SQL = {
      'plotted' => PLOTTED_SQL,
      'unplotted' => "NOT #{PLOTTED_SQL}",
      'model' => 'units.modal_unit IS TRUE',
      'manual' => "(#{MANUAL_SQL})",
      'noPhotos' => NO_PHOTOS_SQL
    }.freeze
    AVAILABILITY_SQL = {
      'sold' => 'units.sold IS TRUE',
      'notAvailable' => '(units.sold IS NOT TRUE AND units.available IS NOT TRUE)',
      'soon' => '(units.sold IS NOT TRUE AND units.available IS TRUE AND units.available_date::date > :today)',
      'now' => '(units.sold IS NOT TRUE AND units.available IS TRUE ' \
               'AND (units.available_date IS NULL OR units.available_date::date <= :today))'
    }.freeze
    BEDROOMS_SQL = "NULLIF(floorplans.bedrooms, '')::numeric".freeze

    def initialize(community, params)
      @community = community
      @params = params
    end

    # The filtered relation, in the grid's order.
    def scope
      @scope ||= begin
        relation = UnitFilterQuery.new(community, pass_through).results.includes(:door)
        relation = apply_ids(relation)
        relation = apply_floorplan(relation)
        relation = apply_availability(relation)
        relation = apply_text_list(relation, :building, 'units.building')
        relation = apply_floor(relation)
        relation = apply_state(relation)
        relation = apply_numeric_list(relation, :beds, BEDROOMS_SQL)
        apply_numeric_list(relation, :baths, 'floorplans.bathrooms')
      end
    end

    def page
      @page ||= PaginatedCollection.new(scope, page: params[:page], per_page: params[:per_page].presence || DEFAULT_PER_PAGE)
    end

    # The toolbar's options, over every unit of the property (not the filtered
    # set): what the floor plans listing cannot say on its own. The floor plan
    # options themselves come from that listing.
    def options
      units = community.units
      joined = units.joins(UnitFilterQuery::FLOORPLAN_JOIN)
      {
        buildings: units.where.not(building: [nil, '']).distinct.order(:building).pluck(:building),
        floors: units.where.not(floor: nil).distinct.order(:floor).pluck(:floor),
        bedrooms: joined.where.not(floorplans: { bedrooms: [nil, ''] }).distinct.pluck(Arel.sql(BEDROOMS_SQL)).compact.map(&:to_f).sort,
        bathrooms: joined.where.not(floorplans: { bathrooms: nil }).distinct.pluck(Arel.sql('floorplans.bathrooms')).compact.map(&:to_f).sort,
        missing: {
          floorplan: joined.where('floorplans.id IS NULL').exists?,
          building: units.where("units.building IS NULL OR units.building = ''").exists?,
          floor: units.where(floor: nil).exists?
        }
      }
    end

    # The day "available now" is measured against.
    def today
      @today ||= begin
        Date.iso8601(params[:today].to_s)
      rescue ArgumentError, TypeError
        Date.current
      end
    end

    private

      attr_reader :community, :params

      def pass_through
        PASS_THROUGH.each_with_object({}) do |key, acc|
          value = params[key]
          acc[key] = value if value.present?
        end
      end

      # A filter takes one value or several (`building=A,B`, or `building[]=…`).
      def list(key)
        Array(params[key]).flat_map { |value| value.to_s.split(',') }.map(&:strip).reject(&:blank?).uniq
      end

      # Only the named units — still within the property's own scope: an id of
      # another property's unit simply finds nothing.
      def apply_ids(relation)
        ids = list(:ids).select { |value| value.match?(/\A\d+\z/) }.map(&:to_i)
        return relation if ids.empty?

        relation.where(units: { id: ids })
      end

      def apply_floorplan(relation)
        values = list(:floorplan)
        return relation if values.empty?

        clauses = []
        clauses << 'floorplans.id IS NULL' if values.delete(NONE)
        ids = values.map(&:to_i).select(&:positive?)
        clauses << 'floorplans.id IN (:ids)' if ids.any?
        return relation if clauses.empty?

        relation.where(clauses.join(' OR '), ids: ids)
      end

      def apply_availability(relation)
        values = list(:availability) & AVAILABILITY_SQL.keys
        return relation if values.empty?

        relation.where(values.map { |value| AVAILABILITY_SQL[value] }.join(' OR '), today: today)
      end

      def apply_state(relation)
        values = list(:state) & STATE_SQL.keys
        return relation if values.empty?

        relation.where(values.map { |value| "(#{STATE_SQL[value]})" }.join(' OR '))
      end

      def apply_text_list(relation, key, column)
        values = list(key)
        return relation if values.empty?

        clauses = []
        clauses << "(#{column} IS NULL OR #{column} = '')" if values.delete(NONE)
        clauses << "#{column} IN (:values)" if values.any?
        relation.where(clauses.join(' OR '), values: values)
      end

      def apply_floor(relation)
        values = list(:floor)
        return relation if values.empty?

        clauses = []
        clauses << 'units.floor IS NULL' if values.delete(NONE)
        floors = values.select { |value| value.match?(/\A-?\d+\z/) }.map(&:to_i)
        clauses << 'units.floor IN (:floors)' if floors.any?
        return relation if clauses.empty?

        relation.where(clauses.join(' OR '), floors: floors)
      end

      def apply_numeric_list(relation, key, sql)
        values = list(key).select { |value| value.match?(/\A-?\d+(\.\d+)?\z/) }.map(&:to_f)
        return relation if values.empty?

        relation.where("#{sql} IN (:values)", values: values)
      end
  end
end
