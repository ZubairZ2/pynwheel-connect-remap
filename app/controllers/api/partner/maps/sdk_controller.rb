module Api
  module Partner
    module Maps
      class SdkController < ApplicationController
        before_action :verify_api_key
        before_action :load_property, only: [:authorized, :fetch_data]

        PARTNERS = [
          ENV["PARTNER_RENT_API_KEY"],
          ENV["PARTNER_APARTMENTLIST_API_KEY"]
        ].compact.freeze

        def authorized
          render json: {
            success: true,
            message: "Partner verified and property is accessible."
          }, status: :ok
        end

        def fetch_data
          render json: {
            sitemap: sitemap_json,
            floorplates: floorplates_json,
            units: units_json,
            floorplans: floorplans_json,
            status: "success",
            code: 200
          }
        end

        private

        def verify_api_key
          api_key = request.headers["X-API-Key"]

          if api_key.blank?
            return render_error("API key is missing (X-API-Key)", 401)
          end

          unless PARTNERS.include?(api_key)
            return render_error("Invalid API key", 401)
          end

          @partner = api_key
        end

        def load_property
          property_id = params[:property_id] || params[:propertyId]

          return render_error("Property ID is missing.", 400) if property_id.blank?

          @property = Community.find_by(id: property_id)

          return render_error("Invalid Property ID or not associated.", 404) if @property.nil?
        end

        def sitemap_json
          return nil unless @property&.is_sitemap?

          sitemap = @property.sitemap
          return nil unless sitemap

          {
            mapId: sitemap.id,
            svgUrl: sitemap.svg_image_url || sitemap.svg_image.url
          }
        end

        def floorplates_json
          return [] if @property.is_sitemap?

          @property.floorplates.map do |fp|
            {
              mapId: fp.id,
              range: fp.range,
              svgUrl: fp.svg_image_url || fp.svg_image.url
            }
          end
        end

        def units_json
          @property.units.map do |u|
            {
              unitNumber: u.marketing_name,
              mapId: map_for_unit(u),
              unitId: u.id,
              building: u.building,
              floor: u.floor,
              floorplanId: u.floorplan_id,
              pointerData: u.pointer_data
            }
          end
        end

        def map_for_unit(unit)
          return @property.sitemap.id if @property.is_sitemap?
          @property.floorplate_for_floor(unit.floor)&.id
        end

        def floorplans_json
          @property.floorplans.map do |fp|
            {
              floorplanId: fp.id,
              name: fp.name,
              bed: fp.bedrooms,
              bath: fp.bathrooms
            }
          end
        end

        def render_error(message, status)
          render json: {
            message: message,
            status: "failed",
            code: status
          }, status: status
        end

      end
    end
  end
end