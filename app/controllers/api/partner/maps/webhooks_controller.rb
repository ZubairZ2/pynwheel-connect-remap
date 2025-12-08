module Api
  module Partner
    module Maps
      class WebhooksController < BaseController

        # Only load community when needed
        before_action :load_property_for_units, only: [:units]

        def properties
          property_id = params[:propertyId].to_s

          if property_id.present?
            # Load ONLY the required property — NOT all communities
            community = Community.active_client_properties
                                 .includes(:company)
                                 .find_by(id: property_id)

            if community
              render json: {
                propertyDetails: format_property(community),
                message: "Property details",
                status: 'success',
                code: 200
              }
            else
              render json: {
                message: INVALID_PROPERTY_MESSAGE,
                status: 'failed',
                code: 404
              }, status: :not_found
            end

          else
            # Only here do we load all — acceptable for list use-case
            communities = Community.active_client_properties.includes(:company)

            render json: {
              propertiesList: communities.map { |c| format_property(c) },
              message: "All properties list",
              status: 'success',
              code: 200
            }
          end
        end


        # --------------------------
        #        Units API
        # --------------------------
        def units
          unit_id = params[:unitId].to_s

          if unit_id.present?
            unit = @community.units.find_by(id: unit_id)

            unless unit
              return render json: {
                message: "Invalid Unit ID",
                status: 'failed',
                code: 404
              }, status: :not_found
            end

            render json: {
              unitDetails: format_unit(unit, @community),
              message: "Unit details",
              status: 'success',
              code: 200
            }

          else
            render json: {
              unitsList: @community.units.map { |u| format_unit(u, @community) },
              message: "Units list",
              status: 'success',
              code: 200
            }
          end
        end


        # --------------------------
        #       PRIVATE HELPERS
        # --------------------------
        private

        # Loads ONLY the specific propertyId
        def load_property_for_units
          property_id = params[:propertyId].to_s

          return render json: {
            message: MISSING_PROPERTY_MESSAGE,
            status: 'failed',
            code: 400
          }, status: :bad_request if property_id.blank?

          @community = Community.active_client_properties
                                .includes(:units)
                                .find_by(id: property_id)

          unless @community
            return render json: {
              message: INVALID_PROPERTY_MESSAGE,
              status: 'failed',
              code: 404
            }, status: :not_found
          end
        end


        def format_property(community)
          {
            propertyId: community.id,
            propertyName: community.name,
            companyId: community.company_id,
            companyName: community.company&.name,
            fullAddress: community.make_address,
            address: community.address,
            city: community.city,
            state: community.state,
            zip: community.zip
          }
        end


        def format_unit(unit, community)
          {
            unitNumber: unit.marketing_name,
            mapId: community.floorplate_for_floor(unit.floor)&.id,
            assetId: unit.id,
            buildingId: unit.building,
            floorId: unit.floor,
            floorplanId: unit.floorplan_id
          }
        end

      end
    end
  end
end