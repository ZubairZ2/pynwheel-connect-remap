module Api
  module Partner
    module Maps
      class SdkController < BaseController
        include ApplicationHelper
        include CommunitiesHelper

        # `authorized` → still uses X-API-Key (one-time exchange)
        before_action :load_property, only: [:authorized]

        # `fetch_data` and `fetch_svg_image` → session token only, no X-API-Key needed
        skip_before_action :load_map_partners,  only: [:fetch_data, :fetch_svg_image]
        skip_before_action :validate_api_key,   only: [:fetch_data, :fetch_svg_image]
        skip_before_action :load_partner_name,  only: [:fetch_data, :fetch_svg_image]
        before_action :validate_session_token,      only: [:fetch_data, :fetch_svg_image]
        before_action :load_community_from_session, only: [:fetch_data, :fetch_svg_image]

        # ------------------------------------------------------------------
        # GET /api/partner/maps/authorized?propertyId=:id
        # Validates X-API-Key + propertyId, returns a short-lived session token.
        # The API key is used exactly once here and never again.
        # ------------------------------------------------------------------
        def authorized
          token = generate_session_token(@api_key, @community.id)
          render json: {
            success: true,
            session_token: token,
            message: "Partner verified and property is accessible."
          }, status: :ok
        end

        # ------------------------------------------------------------------
        # GET /api/partner/maps/fetch_data
        # Authorization: Bearer <session_token>
        # Property ID is taken from the session token — NOT from query params.
        # Response intentionally omits svgUrl; callers use mapId to fetch SVGs.
        # ------------------------------------------------------------------
        def fetch_data
          render json: {
            property:    property_json,
            sitemap:     sitemap_json,
            floorplates: floorplates_json,
            units:       units_json,
            floorplans:  floorplans_json,
            amenities:   amenities_json,
            status: "success",
            code: 200
          }
        end

        # ------------------------------------------------------------------
        # GET /api/partner/maps/fetch_svg_image?map_id=:id&map_type=sitemap|floorplate
        # Authorization: Bearer <session_token>
        # Resolves the real storage URL server-side — it never reaches the client.
        # Ownership is validated: map must belong to the session's property.
        # ------------------------------------------------------------------
        def fetch_svg_image
          map_id   = params[:map_id]   || params[:mapId]
          map_type = params[:map_type] || params[:mapType]

          svg_url = resolve_svg_url(map_id, map_type)

          if svg_url.nil?
            render plain: "Map not found.", status: :not_found
            return
          end

          svg_data = fetch_svg_by_url(svg_url)

          unless svg_data
            render plain: "Failed to fetch SVG.", status: :bad_request
            return
          end

          send_data svg_data, type: 'image/svg+xml', disposition: 'inline'
        rescue => e
          render plain: "Failed to fetch SVG: #{e.message}", status: :bad_request
        end

        private

        # ------------------------------------------------------------------
        # SESSION TOKEN — signed with Rails' MessageVerifier (HMAC-SHA256).
        # Token is scoped to one partner + one property and expires in 1 hour.
        # ------------------------------------------------------------------
        def generate_session_token(api_key, property_id)
          payload = {
            api_key:     api_key,
            property_id: property_id.to_s,
            exp:         1.hour.from_now.to_i
          }
          Rails.application.message_verifier(:pyn_sdk_v1).generate(payload)
        end

        # ------------------------------------------------------------------
        # Resolve SVG URL from map_id + map_type, enforcing community ownership.
        # The actual storage URL is never sent to the browser.
        # ------------------------------------------------------------------
        def resolve_svg_url(map_id, map_type)
          return nil unless map_id.present?

          # get_environment_based_svg_url returns svg_image.path in development
          # (because fetch_svg_by_url does File.read in dev) and the S3 URL in production.
          case map_type
          when 'sitemap'
            sitemap = @community.sitemap
            return nil unless sitemap&.id == map_id.to_i
            get_environment_based_svg_url(sitemap)
          when 'floorplate'
            fp = @community.floorplates.find_by(id: map_id)
            get_environment_based_svg_url(fp)
          else
            if @community.sitemap&.id == map_id.to_i
              get_environment_based_svg_url(@community.sitemap)
            else
              fp = @community.floorplates.find_by(id: map_id)
              get_environment_based_svg_url(fp)
            end
          end
        end

        # ------------------------------------------------------------------
        # Load community for the one-time authorized endpoint (from params).
        # ------------------------------------------------------------------
        def load_property
          property_id = params[:property_id] || params[:propertyId]
          return render_error("Property ID is missing.", 400) if property_id.blank?

          @community = Community.find_by(id: property_id)
          return render_error("Invalid Property ID or not associated.", 404) if @community.nil?
        end

        # ------------------------------------------------------------------
        # Load community for session-based endpoints (from session token).
        # ------------------------------------------------------------------
        def load_community_from_session
          @community = Community.find_by(id: @session_property_id)
          return render_error("Property not found.", 404) if @community.nil?
        end

        # ------------------------------------------------------------------
        # Serialisers — svgUrl is intentionally excluded from all responses.
        # ------------------------------------------------------------------

        # ------------------------------------------------------------------
        # property_json — full property-level configuration for the SDK.
        # Organised into logical sections so the front-end can consume each
        # group independently without having to know about internal Rails details.
        # ------------------------------------------------------------------
        def property_json
          {
            # ── Identity ──────────────────────────────────────────────────
            propertyId:   @community.id,
            propertyName: @community.name,
            website:      @community.community_website,

            # ── Branding ──────────────────────────────────────────────────
            branding: {
              logoUrl:         resolve_map_logo_url(@community),
              scheduleTourUrl: @community.schedule_tour_url,
              schedulerWidget: @community.scheduler_widget,
              poweredByBtn:    @community.powered_by_btn
            },

            # ── Map type & rendering mode ──────────────────────────────────
            map: {
              type:                 @community.is_sitemap ? "sitemap" : "floorplate",
              enableSvgMode:        @community.enable_svg_mode,
              defaultFloor:         @community.default_map_floor,
              sitemapAutoZoom:      @community.sitemap_auto_zoom,
              enable3dMaps:         @community.enable_three_d_maps,
              defaultSatelliteView: @community.default_satellite_view
            },

            # ── Unit display & pricing ─────────────────────────────────────
            unitDisplay: {
              displayRent:                  @community.display_rent,
              displayPricingOptions:        @community.display_pricing_options,
              displayBuilding:              @community.display_building,
              displayAvailableDate:         @community.display_available_date,
              displayAdditionalFee:         @community.display_additional_fee,
              pricingMessage:               @community.pricing_message,
              hideBedrooms:                 @community.hide_bedrooms_bathrooms,
              hideSquareFeet:               @community.hide_square_feet,
              hideAvailability:             @community.hide_availability,
              unitsAvailabilityOver120Days: @community.units_availability_over_120_days,
              coloringMode:                 @community.coloring_mode  # "by_property" | "by_floorplan"
            },

            # ── Marker & colour config (from CommunitiesHelper) ───────────
            markerConfig: map_configuration(@community),

            # ── Unit colours used in by_property colouring mode ───────────
            unitColors: {
              availableColor:   @community.available_units_color,
              availableOpacity: @community.available_units_opacity.to_f,
              modelColor:       @community.model_units_color,
              modelOpacity:     @community.model_units_opacity.to_f
            },

            # ── Amenity / legend visibility ────────────────────────────────
            legend: {
              showPropertyMapKey:  @community.show_property_map_key,
              propertyMapKeyText:  @community.show_property_map_key_text,
              showAmenityKey:      @community.show_amenity_key,
              amenityKeyText:      @community.show_amenity_key_text,
              showAmenityName:     @community.show_amenity_name
            },

            # ── Marketing availability mode ────────────────────────────────
            marketingMode: {
              turnAvailabilityOn: @community.turn_availability_on
            },

            # ── Filter panel toggles ───────────────────────────────────────
            filters: property_filters_json,

            # ── Typography ────────────────────────────────────────────────
            fontFamily: @community.font_setting&.svg_labels_font_family
          }
        end

        def property_filters_json
          return {} unless @community.map_filter

          filter_list = @community.map_filter.get_filter_list(false)
          {
            showBedroomFilter:      filter_list[:show_bedroom_filter],
            showPricingFilter:      filter_list[:show_pricing_filter],
            showSquareFeetFilter:   filter_list[:show_square_feet_filter],
            showAvailabilityFilter: filter_list[:show_availability_filter],
            showPropertiesFilter:   filter_list[:show_properties_filter]
          }
        end

        # Resolves the community's map logo URL without pulling in CommunityHelper
        # (which has view dependencies). Falls back to the primary logo.
        def resolve_map_logo_url(community)
          logo = community.map_logo.presence || community.logo.presence
          return nil if logo.blank?
          logo.respond_to?(:url) ? logo.url : logo.to_s
        end

        def sitemap_json
          return nil unless @community&.is_sitemap?

          sitemap = @community.sitemap
          return nil unless sitemap

          { mapId: sitemap.id, mapType: 'sitemap' }
        end

        def floorplates_json
          return [] if @community.is_sitemap?

          @community.floorplates.map do |fp|
            { mapId: fp.id, mapType: 'floorplate', range: fp.range }
          end
        end

        def units_json
          units = @community&.units&.map_units(@community)
          units&.map do |unit|
            floorplan    = unit.floorplan
            fees    = @community.get_additional_fees(unit)
            buttons = unit_additional_buttons(unit)

            {
              unitNumber:      unit.marketing_name,
              mapId:           map_for_unit(unit),
              unitId:          unit.id,
              building:        unit.building,
              floor:           unit.floor,
              sold:            unit.sold,
              bedrooms:        floorplan.present? ? hide_decimals(floorplan.bedrooms)  : nil,
              bathrooms:       floorplan.present? ? hide_decimals(floorplan.bathrooms) : nil,
              square_feet:     if unit.square_feet?
                                 hide_decimals(unit.square_feet)
                               elsif floorplan.present?
                                 hide_decimals(floorplan.square_feet)
                               end,
              floorplanId:       unit.floorplan_id,
              floorplanName:     floorplan&.name,
              pointerData:       unit.pointer_data,
              market_rent:       unit.get_market_rent(),
              availability:      unit.availability,
              availability_url:  unit.get_availability_url(),
              available_date:    unit.available_date,
              available:         unit.available,
              lease_term:        unit.lease_term,
              lease_pricing:     (unit.lease_pricing.present? && unit.community.display_pricing_options) ? unit.lease_pricing : "",
              description:       unit.description.present? ? unit.description : floorplan&.description.presence || "",
              display_rent:      unit&.community&.display_rent,
              additional_fees:   fees,
              property_id:       unit.property_id,
              unit_status:       unit&.unit_status,
              model_unit:        unit&.modal_unit,
              additionalButtons:       unit_additional_buttons(unit),
              unit_variation:          unit_variation(unit, fees),
              pricing_calculator_url:  unit.pricing_calculator_url,
              image:                   unit.validated_image_url || floorplan&.validated_image_url || floorplan&.secondary_image&.url.presence,
              color:    compute_unit_marketing_color(unit, floorplan),
              opsColor: compute_unit_ops_color(unit)
            }
          end
        end

        # Returns a UI variation number (1–6) for the unit based on its available data.
        # Variation 1 — Premium, monthly lease listings, fees, 1 additional button (no move-in date)
        # Variation 2 — Non-premium, lease pricing table, no additional buttons
        # Variation 3 — Non-premium, lease pricing table, multiple additional buttons (> 1)
        # Variation 4 — Non-premium, 1 additional button, no lease pricing
        # Variation 5 — Premium, move-in date, fees, 1 additional button (no lease listing)
        # Variation 6 — Premium, move-in date + monthly lease listings, fees, 1 additional button
        def unit_variation(unit, additional_fees)
          is_model_unit      = unit.modal_unit
          buttons            = unit_additional_buttons(unit)
          has_links          = buttons.any?
          has_one_link       = (buttons.count === 1)
          has_multiple_links = buttons.length > 1
          has_fees           = additional_fees.present?
          has_lease_pricing  = unit.lease_pricing.present? && unit.community.display_pricing_options
          display_rent       = unit.community.display_rent

          # Premium variations (most specific first)
          return 6 if is_model_unit && display_rent && has_lease_pricing && has_fees && has_links
          return 5 if is_model_unit && display_rent && has_fees && has_links
          return 1 if is_model_unit && has_lease_pricing && has_fees && has_links

          # Non-premium variations
          return 2 if !is_model_unit && !has_links && has_lease_pricing && !has_fees
          return 3 if !is_model_unit && has_lease_pricing && has_multiple_links && !has_fees
          return 4 if !is_model_unit && has_one_link && !has_fees

          1
        end

        def unit_additional_buttons(unit)
          [
            { label: unit.get_virtual_tour_label,     url: unit.get_virtual_tour_url,     openInNewTab: unit.link1_open_in_new_tab? },
            { label: unit.get_additional_button_label, url: unit.get_additional_button_url, openInNewTab: unit.link2_open_in_new_tab? },
            { label: unit.get_schedule_tour_label,    url: unit.get_schedule_tour_url,    openInNewTab: unit.link3_open_in_new_tab? }
          ].select { |btn| btn[:url].present? }
        end


        def map_for_unit(unit)
          return @community.sitemap.id if @community.is_sitemap?
          @community.floorplate_for_floor(unit.floor)&.id
        end

        def floorplans_json
          units_by_floorplan = (@community.units || []).group_by(&:floorplan_id)

          @community.floorplans.map do |fp|
            fp_units   = units_by_floorplan[fp.id] || []
            first_unit = fp_units.find(&:available) || fp_units.first

            {
              floorplanId:      fp.id,
              name:             fp.name,
              bedrooms:         fp.bedrooms,
              bathrooms:        fp.bathrooms,
              market_rent:      fp.market_rent,
              square_feet:      fp.square_feet,
              description:      fp.description.presence,
              availability_url: first_unit&.get_availability_url(),
              primaryImage:     fp.image.present?           ? fp.validated_image_url                                        : nil,
              secondaryImage:   fp.secondary_image.present? ? fp.convert_to_s3_accelerate_url(fp.secondary_image.url) : nil,
              color:            compute_floorplan_color(fp)
            }
          end
        end

        def amenities_json
          amenity_color_cfg = amenity_marker_config(@community)

          Amenity
            .where(community_id: @community.id)
            .includes(:amenity_galleries)
            .order(:sort)
            .map do |a|
              {
                amenityId:        a.id,
                name:             a.name,
                description:      a.description.presence,
                amenityType:      a.amenty_type,
                image:            a.validated_image_url,
                directionalText:  a.directional_text.presence,
                colorConfig:      amenity_color_cfg,
                additionalImages: a.amenity_galleries.map { |g|
                  {
                    name:        g.name.presence,
                    description: g.description.presence,
                    image:       g.image.present? ? a.convert_to_s3_accelerate_url(g.image.url) : nil
                  }
                }
              }
            end
        end

        # ------------------------------------------------------------------
        # COLOR CALCULATION — fully resolved server-side.
        # SDK clients receive { color: "#hex", opacity: float } and apply
        # it directly; no branching on coloring_mode or unit_status needed.
        #
        # Mirrors the JS call chain in webpages.js:
        #   getUnitMarkerColor → (opsMapMarkersEnabled branch)
        #                      → isFloorplanMapEnabled / checkFloorPlanColorMode
        #                        → getMarkerColor → getColorByFloorplan / getColorByProperty
        # ------------------------------------------------------------------

        # Marketing-map colour for a unit.
        # Source: floorplan columns (by_floorplan) or community columns (by_property).
        # available_units_color is used for normal units; model_units_color for model units.
        # Mirrors: getColorByFloorplan / getColorByProperty in webpages.js
        def compute_unit_marketing_color(unit, floorplan)
          is_model = unit.modal_unit

          if @community.by_floorplan? && floorplan.present?
            color   = is_model ? floorplan.model_units_color   : floorplan.available_units_color
            opacity = is_model ? floorplan.model_units_opacity : floorplan.available_units_opacity
          else
            color   = is_model ? @community.model_units_color   : @community.available_units_color
            opacity = is_model ? @community.model_units_opacity : @community.available_units_opacity
          end

          { color: color, opacity: opacity.to_f }
        end

        # Ops-map colour for a unit — fully status-driven, community-level colours.
        # Model units always receive the model colour regardless of their status string.
        # Mirrors: getUnitMarkerColor (ops branch) + switch(unitStatus) in webpages.js
        def compute_unit_ops_color(unit)
          sc = status_colors  # memoized hash of community ops colours

          # Model units take priority over any status string (same as JS)
          return { color: sc[:model], opacity: 1.0 } if unit.modal_unit

          hex = case unit.unit_status.to_s.downcase.strip
                when "occupied", "occupied no notice", "notice rented"
                  sc[:occupied]
                when "occupied on notice", "notice unrented"
                  sc[:occupied_on_notice]
                when "vacant", "available", "unoccupied",
                     "vacant unrented not ready", "vacant unrented ready"
                  sc[:vacant]
                when "vacant lease", "vacant rented ready", "vacant rented not ready"
                  sc[:vacant_leased]
                else
                  sc[:vacant]   # fallback — matches JS default → map_marker_color
                end

          { color: hex, opacity: 1.0 }
        end

        # Marketing-map colour for a floorplan row (represents available units).
        # Source: floorplan columns (by_floorplan) or community columns (by_property).
        def compute_floorplan_color(fp)
          if @community.by_floorplan?
            { color: fp.available_units_color, opacity: fp.available_units_opacity.to_f }
          else
            { color: @community.available_units_color, opacity: @community.available_units_opacity.to_f }
          end
        end

        # Memoised ops-map colour palette — computed once per request.
        # vacant → default_unit_marker_color (= map_marker_color in JS, set from
        #          webpages/index.html.haml: marker_colors = { vacant: map_marker_color, … })
        def status_colors
          @status_colors ||= begin
            c = status_based_default_colors(@community)
            {
              vacant:           default_unit_marker_color(@community),
              occupied:         c[:occupied],
              occupied_on_notice: c[:occupied_on_notice],
              vacant_leased:    c[:vacant_leased],
              model:            c[:model],
              missing:          c[:missing]   # SVG mode only
            }
          end
        end

        def render_error(message, status)
          render json: { message: message, status: "failed", code: status }, status: status
        end

      end
    end
  end
end
