module Api
  module Partner
    module Maps
      class SdkController < BaseController
        include ApplicationHelper

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
            floorplan = unit.floorplan

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
              additional_fees:   @community.get_additional_fees(unit),
              property_id:       unit.property_id,
              unit_status:       unit&.unit_status,
              model_unit:        unit&.modal_unit,
              image:             unit.validated_image_url || floorplan&.validated_image_url || floorplan&.secondary_image&.url.presence
            }
          end
        end

        def map_for_unit(unit)
          return @community.sitemap.id if @community.is_sitemap?
          @community.floorplate_for_floor(unit.floor)&.id
        end

        def floorplans_json
          units_by_floorplan = (@community.units || []).group_by(&:floorplan_id)

          @community.floorplans.map do |fp|
            fp_units     = units_by_floorplan[fp.id] || []
            first_unit   = fp_units.find(&:available) || fp_units.first

            {
              floorplanId:      fp.id,
              name:             fp.name,
              bedrooms:         fp.bedrooms,
              bathrooms:        fp.bathrooms,
              market_rent:      fp.market_rent,
              square_feet:      fp.square_feet,
              description:      fp.description.presence,
              availability_url: first_unit&.get_availability_url(),
              primaryImage:     fp.image.present?           ? fp.validated_image_url                                          : nil,
              secondaryImage:   fp.secondary_image.present? ? fp.convert_to_s3_accelerate_url(fp.secondary_image.url) : nil
            }
          end
        end

        def amenities_json
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

        def render_error(message, status)
          render json: { message: message, status: "failed", code: status }, status: status
        end

      end
    end
  end
end
