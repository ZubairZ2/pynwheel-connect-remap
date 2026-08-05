module PynwheelLaunch
  # The single definition of the Launch onboarding forms: which records back
  # each one, when a community's product mix asks for it, and how a set of
  # record statuses rolls up into the one status the form displays.
  #
  # All of that used to be spelled out once per consumer -- CommunityDetailForms,
  # FollowUpEmails, Searcher and the Statuses service each carried their own
  # copy -- and the copies had drifted, so the same community could report one
  # status on the dashboard and another inside the form.
  #
  # ---------------------------------------------------------------------------
  # Adding a form
  # ---------------------------------------------------------------------------
  #   1. Name it in config/initializers/constants.rb.
  #   2. Add one Definition to DEFINITIONS below, in the position Launch should
  #      display it.
  #   3. Give each backing model `include LaunchStatusable` and a
  #      `derive_launch_status` saying when that record counts as complete.
  #
  # Nothing else needs to change: the community page, the dashboard rings, the
  # follow-up emails, the move-to-production sweep and the dashboard filters
  # all read this list.
  module Forms
    # One onboarding form.
    #
    #   name     - the constant Launch and the front end match on
    #   records  - community -> the records whose status this form reports.
    #              May return a single record, an array, a relation, or nils;
    #              they are flattened and compacted.
    #   required - community, products -> whether this community must fill it
    #              in. Defaults to always.
    Definition = Struct.new(:name, :records, :required, keyword_init: true) do
      def records_for(community)
        Array.wrap(records.call(community)).flatten.compact
      rescue StandardError => ex
        Rails.logger.error("PynwheelLaunch::Forms: could not resolve #{name.inspect} for community #{community&.id} - #{ex.message}")
        []
      end

      def required_for?(community, products)
        return true if required.nil?

        required.call(community, products)
      rescue StandardError => ex
        Rails.logger.error("PynwheelLaunch::Forms: could not test #{name.inspect} for community #{community&.id} - #{ex.message}")
        false
      end
    end

    PRODUCTS = %w[self_tour pynwheel_touch pynwheel_maps graphic_design_services additional_options].freeze

    DESIGN_DIRECTION_STYLES = ["Modernist Horizontal", "Modernist Vertical", EXPRESSIONIST].freeze

    TOUCH     = ->(_community, products) { products.include?("pynwheel_touch") }
    SELF_TOUR = ->(_community, products) { products.include?("self_tour") }

    # In the order Launch presents them.
    DEFINITIONS = [
      Definition.new(
        name: PROPERTY_MANAGEMENT_SYSTEM,
        records: ->(community) { data_provider_records(community) }
      ),
      Definition.new(
        name: COMMUNITY_DETAILS,
        records: ->(community) { community }
      ),
      Definition.new(
        name: PROPERTY_MAP_IMAGES,
        records: ->(community) { community.is_sitemap ? community.sitemap : community.floorplates }
      ),
      Definition.new(
        name: HARDWARE_SPECS,
        records: ->(community) { community.hardware_spec },
        required: ->(community, _products) { option(community, "pynwheel_touch", "options", "installation").eql?("Yes") }
      ),
      Definition.new(
        name: TOUCH_GALLERY_MEDIA,
        records: ->(community) { community.galleries },
        required: TOUCH
      ),
      Definition.new(
        name: TOUCH_HOME_PAGE_MEDIA,
        records: ->(community) { [community.design&.home_page_images, community.design&.home_page_video] },
        required: TOUCH
      ),
      Definition.new(
        name: LOCK_PROVIDER,
        records: ->(community) { lock_provider_records(community) },
        required: SELF_TOUR
      ),
      Definition.new(
        name: TOUR_STOPS,
        records: ->(community) { community.community_tour&.tour_stops },
        required: SELF_TOUR
      ),
      Definition.new(
        name: VISITING_HOURS,
        records: ->(community) { [community.opening_hours, community.guided_opening_hours] },
        required: SELF_TOUR
      ),
      Definition.new(
        name: FLOORPLAN_IMAGES,
        records: ->(community) { community.floorplans }
      ),
      # These three are only ever asked for when a community has an explicit
      # product_options. Communities predating it have never been shown them,
      # so they read the options directly rather than the products list, which
      # falls back to the legacy boolean columns.
      Definition.new(
        name: DESIGN_DIRECTION,
        records: ->(community) { community.design_direction },
        required: lambda { |community, _products|
          option(community, "pynwheel_touch", "is_enabled") == true &&
            DESIGN_DIRECTION_STYLES.include?(option(community, "pynwheel_touch", "options", "design_style"))
        }
      ),
      Definition.new(
        name: AMENITY_IMAGES,
        records: ->(community) { community.amenities },
        required: lambda { |community, _products|
          option(community, "self_tour", "is_enabled") == true ||
            option(community, "pynwheel_touch", "is_enabled") == true ||
            option(community, "pynwheel_maps") == true
        }
      ),
      Definition.new(
        name: EBROCHURE,
        records: ->(community) { [community.favorite_setting&.ebrochure_menu_buttons, community.favorite_setting&.favorite_images] },
        required: TOUCH
      ),
      Definition.new(
        name: ADDITIONAL_PAGES,
        records: ->(community) { [community.webpages, community.imagepages] },
        required: lambda { |community, _products|
          options?(community) &&
            option(community, "self_tour", "is_enabled") != true &&
            option(community, "pynwheel_touch", "is_enabled") == true &&
            option(community, "pynwheel_maps") != true
        }
      ),
      # Collected during company setup rather than per community, so it is
      # resolvable by name but never listed on a community's form list.
      Definition.new(
        name: COMPANY_DETAILS,
        records: ->(community) { community.company },
        required: ->(_community, _products) { false }
      )
    ].freeze

    BY_NAME = DEFINITIONS.index_by(&:name).freeze

    ALL = DEFINITIONS.map(&:name).freeze

    class << self
      def definition(form)
        BY_NAME[form]
      end

      # ---------------------------------------------------------------- records

      # Every record backing `form`, flattened, with the missing ones dropped.
      # A form with nothing behind it yet returns [].
      def records_for(community, form)
        return [] if community.blank?

        definition(form)&.records_for(community) || []
      end

      # ---------------------------------------------------------------- reading

      # What the community page shows: one entry per distinct status among the
      # form's records. Reads never write -- a record with no Status row of its
      # own reports its derived status rather than dropping out of the form.
      def statuses_for(community, form)
        records_for(community, form).map(&:launch_status_and_remarks_obj).uniq
      end

      # What the dashboard and the follow-up emails show: the form's records
      # collapsed to the single status that best describes them.
      def rolled_up_status(community, form)
        roll_up(records_for(community, form).map { |record| record.launch_status_and_remarks_obj[:name] })
      end

      # One rejected record demands attention before anything else; one record
      # still in progress holds the whole form back.
      def roll_up(statuses)
        return nil if statuses.blank?

        return REJECTED if statuses.any? { |s| s.eql?(REJECTED) }
        return IN_PROGRESS if statuses.any? { |s| s.eql?(IN_PROGRESS) || s.nil? }
        return SUBMITTED if statuses.all? { |s| s.eql?(SUBMITTED) }
        return APPROVED if statuses.all? { |s| s.eql?(APPROVED) }
        return RELEASED if statuses.all? { |s| s.eql?(RELEASED) }
        return FORM_APPROVED if statuses.all? { |s| s.eql?(FORM_APPROVED) }
        return APPLICATION_IN_REVIEW if statuses.all? { |s| s.eql?(APPLICATION_IN_REVIEW) }

        IN_PROGRESS
      end

      # ---------------------------------------------------------------- writing

      # Applies a reviewer's decision to every record behind the form,
      # materialising Status rows for the ones that came in from Connect.
      def apply_status(community, form, status, remarks = nil)
        records_for(community, form).each do |record|
          record.launch_status&.update(status: status, remarks: remarks)
        end
      end

      # ------------------------------------------------------------ eligibility

      # The forms this community's product mix asks for, in display order.
      def applicable_for(community, products = nil)
        return [] if community.blank?

        products = Array(products.presence || products_for(community))
        DEFINITIONS.select { |definition| definition.required_for?(community, products) }.map(&:name)
      end

      # The subset the dashboard filters and the follow-up emails judge a
      # community on: the required forms, plus the floorplan form only once
      # there are floorplans to show. The optional extras have never counted
      # towards "is this community ready".
      def core_for(community)
        return [] if community.blank?

        excluded = [HARDWARE_SPECS, DESIGN_DIRECTION, AMENITY_IMAGES, EBROCHURE, ADDITIONAL_PAGES]
        excluded << FLOORPLAN_IMAGES unless community.floorplans.exists?

        applicable_for(community) - excluded
      end

      # The products a community has enabled. Communities predating
      # product_options fall back to their boolean columns.
      def products_for(community)
        return [] if community.blank?

        options = parsed_options(community)
        return legacy_products(community) if options.blank?

        PRODUCTS.select do |product|
          product == "pynwheel_maps" ? option(community, "pynwheel_maps") == true : option(community, product, "is_enabled") == true
        end
      end

      # A value from the community's product_options, or nil if it is unset or
      # unreadable. Path is relative to the "product_options" root.
      def option(community, *path)
        parsed_options(community)&.dig("product_options", *path)
      end

      # Whether this community has an explicit product_options at all.
      def options?(community)
        parsed_options(community).present?
      end

      private

      # ---------------------------------------------------------------- records

      def data_provider_records(community)
        return [] if community.data_provider.blank? && community.credential.blank?

        # Deliberately the most recently touched credential rather than the
        # association, matching how Launch has always picked it.
        records = [Credential.where(community_id: community.id).order(updated_at: :desc).first]
        records << community.crm_credential if community.credential&.use_different_crm_provider
        records
      end

      def lock_provider_records(community)
        [
          community.zerv,
          community.latch,
          community.dwelo,
          community.igloohome,
          community.schlage,
          community.yale,
          community.launch_remote,
          community.other_locks
        ]
      end

      # --------------------------------------------------------------- products

      # product_options is a jsonb column that has been written both as a JSON
      # string and as an object over the years, so accept either.
      def parsed_options(community)
        raw = community.product_options
        return nil if raw.blank?
        return raw if raw.is_a?(Hash)

        JSON.parse(raw)
      rescue JSON::ParserError, TypeError => ex
        Rails.logger.error("PynwheelLaunch::Forms: unreadable product_options for community #{community.id} - #{ex.message}")
        nil
      end

      def legacy_products(community)
        products = []
        products << "pynwheel_touch" if community.touchscreen_app
        products << "self_tour" if community.self_tour
        products
      end
    end
  end
end
