module Connect
  # The Pynwheel Connect Property Detail payload (communities#edit.json): the
  # Properties listing row (Connect::PropertySerializer), plus the columns the
  # legacy Property Details form, Settings page and Floorplates page render,
  # plus counts of the community's existing associations.
  #
  # Read-only and presentation-only: every value is an existing column or an
  # existing association/model method. Nothing here decides anything new.
  class PropertyDetailSerializer
    def initialize(community)
      @community = community
    end

    def as_json(*)
      PropertySerializer.collection([community]).first.merge(
        profile: profile,
        milestones: milestones,
        settings: settings,
        billing: billing,
        touch: touch,
        tour: tour,
        maps: maps,
        inventory: inventory,
        partners: partners
      )
    end

    private

      attr_reader :community

      # communities/_form.html.haml (CommunitiesController#edit)
      def profile
        {
          address: community.address,
          city: community.city,
          state: community.state,
          zip: community.zip,
          latitude: community.latitude&.to_s,
          longitude: community.longitude&.to_s,
          manual_lat_long: community.manual_lat_long,
          phone: community.phone,
          email: community.email,
          website: community.website,
          property_manager_name: community.property_manager_name,
          property_manager_phone: community.property_manager_phone,
          property_manager_email: community.property_manager_email,
          number_of_units: community.number_of_units,
          is_sitemap: community.is_sitemap,
          notes: community.description
        }
      end

      # The four dates Connect::PropertySerializer#stage derives the stage from.
      def milestones
        {
          date_activated: community.date_activated,
          production_started_date: community.production_started_date,
          submitted_final_approval_date: community.submitted_final_approval_date,
          released_date: community.released_date
        }
      end

      # floorplates/index.html.haml (save_apartment_settings), and
      # communities/settings_page.html.haml for Community Logo / Inactivate.
      def settings
        {
          display_rent: community.display_rent,
          display_pricing_options: community.display_pricing_options,
          display_additional_fee: community.display_additional_fee,
          enable_pynwheel_pricing_calculator: community.enable_pynwheel_pricing_calculator,
          enable_pricing_calculator: community.enable_pricing_calculator,
          show_current_availability: community.show_current_availability,
          display_available_date: community.display_available_date,
          units_availability_over_120_days: community.units_availability_over_120_days,
          display_building: community.display_building,
          turn_availability_on: community.turn_availability_on,
          hide_bedrooms_bathrooms: community.hide_bedrooms_bathrooms,
          hide_square_feet: community.hide_square_feet,
          hide_availability: community.hide_availability,
          community_logo: community.community_logo,
          student_housing_property: community.student_housing_property,
          locked: community.locked
        }
      end

      # The stored rates, as entered. settings_page.html.haml shows the Lincoln
      # or Dwelo tour rate instead of billing_rate_selftour for those accounts;
      # `self_tour_rate_field` names the one that page shows, by the same test.
      def billing
        {
          touch: community.billing_rate_touch.presence,
          self_tour: community.billing_rate_selftour.presence,
          lincoln_self_tour: community.lincoln_billing_rate.presence,
          dwelo_self_tour: community.dwelo_billing_rate.presence,
          self_tour_rate_field: self_tour_rate_field,
          maps: community.billing_rate_maps.presence,
          combined: community.billing_rate_for_both.presence,
          billing_type: community.billing_type.presence,
          billing_month: community.billing_month.presence
        }
      end

      def self_tour_rate_field
        return 'lincoln_self_tour' if community.company&.name.to_s.downcase == 'lincoln'
        return 'dwelo_self_tour' if community.creator.present? && community.creator.role == 'Dwelo admin'

        'self_tour'
      end

      # settings_page.html.haml, Pynwheel Touch rows.
      def touch
        {
          code: community.code.presence,
          is_vertical_app: community.is_vertical_app,
          subscription_start_date: community.date_installed,
          mdu: community.mdu,
          show_gesture_icons: community.show_gesture_icons,
          powered_by_btn: community.powered_by_btn
        }
      end

      # settings_page.html.haml (locks, wayfinding); tours/settings.html.haml
      # (ID verification). The property's own tour is Community#community_tour,
      # as Tour Setup uses; the other tours are visitors' customised copies.
      def tour
        record = community.community_tour
        {
          stop_count: record.present? ? record.tour_stops.size : 0,
          visual_id_verification: record&.visual_id_verification,
          enable_locks: community.enable_locks,
          auto_wayfinding: community.auto_wayfinding
        }
      end

      # settings_page.html.haml map rows, and the floorplates page's
      # "Default map to load on floor" (Community#property_floor_options).
      def maps
        default_floor = community.default_map_floor
        floor_label = community.property_floor_options.find { |_label, value| value.to_s == default_floor.to_s }&.first

        {
          web_map_type: community.web_map_type,
          default_satellite_view: community.default_satellite_view,
          default_map_floor: default_floor,
          default_map_floor_label: floor_label,
          enable_three_d_maps: community.enable_three_d_maps,
          is_beans_svg: community.is_beans_svg,
          enable_svg_mode: community.enable_svg_mode,
          enable_sdk_map: community.enable_sdk_map,
          enable_floorplan_level_color: community.enable_floorplan_level_color,
          highlight_all_units_on_hover: community.highlight_all_units_on_hover
        }
      end

      # Counts of the existing associations. Sub-communities come from
      # Community#fetch_multi_properties (empty unless the property has several
      # PMS property ids); a unit belongs to one through `units.property_id`.
      def inventory
        {
          units: community.units.count,
          floorplans: community.floorplans.count,
          floorplates: community.floorplates.count,
          amenities: community.amenities.count,
          # The CMS has no buildings table: a building is the distinct
          # `building` value on the property's units and amenities
          # (Buildings#get_community_buildings / Community#fetch_building_list).
          buildings: building_count,
          sub_communities: sub_communities
        }
      end

      def building_count
        (community.units.distinct.pluck(:building) + community.amenities.distinct.pluck(:building))
          .map { |building| building.to_s.strip }.reject(&:empty?).uniq.size
      end

      def sub_communities
        properties = community.fetch_multi_properties
        return [] if properties.empty?

        unit_counts = Hash.new(0)
        community.units.group(:property_id).count.each { |id, count| unit_counts[id.to_s.strip] += count }

        properties.map { |name, property_id| { name: name, property_id: property_id, unit_count: unit_counts[property_id] } }
      end

      # PartnerConfigurationsController#enabled_partners, with the labels.
      def partners
        Community::MAP_PARTNERS.map do |partner|
          { key: partner[:key], label: partner[:label], enabled: community.partner_map_enabled?(partner[:key]) }
        end
      end
  end
end
