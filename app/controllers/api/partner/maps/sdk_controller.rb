module Api
  module Partner
    module Maps
      class SdkController < BaseController
        include ApplicationHelper
        before_action :load_property, only: [:authorized, :fetch_data]

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

        def load_property
          property_id = params[:property_id] || params[:propertyId]

          return render_error("Property ID is missing.", 400) if property_id.blank?

          @community = Community.find_by(id: property_id)

          return render_error("Invalid Property ID or not associated.", 404) if @community.nil?
        end

        def sitemap_json
          return nil unless @community&.is_sitemap?

          sitemap = @community.sitemap
          return nil unless sitemap

          {
            mapId: sitemap.id,
            svgUrl: sitemap.validated_svg_image_url
          }
        end

        def floorplates_json
          return [] if @community.is_sitemap?

          @community.floorplates.map do |fp|
            {
              mapId: fp.id,
              range: fp.range,
              svgUrl: fp.validated_svg_image_url
            }
          end
        end

        def units_json
          @community.units.map do |unit|
            floorplan = unit.floorplan

            {
              unitNumber: unit.marketing_name,
              mapId: map_for_unit(unit),
              unitId: unit.id,
              building: unit.building,
              floor: unit.floor,
              sold: unit.sold,
              bedrooms: if floorplan.present?
                          hide_decimals(floorplan.bathrooms)
                        else
                          nil
                        end,
              bathrooms:  if floorplan.present?
                            hide_decimals(floorplan.bathrooms)
                          else
                            nil
                          end,
              square_feet:  if unit.square_feet?
                              hide_decimals(unit.square_feet)
                            elsif floorplan.present?
                              hide_decimals(floorplan.square_feet)
                            else
                              nil
                            end,
              floorplanId: unit.floorplan_id,
              pointerData: unit.pointer_data,
              market_rent: unit.get_market_rent(),
              availability: unit.availability,
              availability_url: unit.get_availability_url(),
              available_date: unit.available_date,
              available: unit.available,
              lease_term: unit.lease_term,
              lease_pricing: (unit.lease_pricing.present? && unit.community.display_pricing_options) ? unit.lease_pricing : "",
              description:  if unit.description.present?
                              unit.description
                            elsif floorplan.description.present?
                              floorplan.description
                            else
                              ""
                            end,
              display_rent: unit&.community&.display_rent,
              additional_fees: @community.get_additional_fees(unit),
              property_id: unit.property_id,
              unit_status: unit&.unit_status,
              model_unit: unit&.modal_unit
            }
          end
        end

        def map_for_unit(unit)
          return @community.sitemap.id if @community.is_sitemap?
          @community.floorplate_for_floor(unit.floor)&.id
        end

        def floorplans_json
          @community.floorplans.map do |fp|
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