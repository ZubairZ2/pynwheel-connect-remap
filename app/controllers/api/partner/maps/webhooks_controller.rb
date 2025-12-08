module Api
  module Partner
    module Maps
      class WebhooksController < BaseController
        before_action :load_all_properties
        before_action :load_property, only: [:units]

        def properties
          property_id = params[:propertyId].to_s

          if property_id.present?
            community = @communities.find { |c| c.id.to_s == property_id }
            if community
              render json: {
                propertyDetails: format_property(community),
                message: "Property details",
                status: 'success',
                code: 200
              }
            else
              render json: { message: INVALID_PROPERTY_MESSAGE, status: 'failed', code: 404 }, status: :not_found
            end
          else
            render json: {
              propertiesList: @communities.map { |x| format_property(x) },
              message: "All properties list",
              status: 'success',
              code: 200
            }
          end
        end

        def units
          unit_id = params[:unitId].to_s

          if unit_id.present?
            unit = @community.units.find { |u| u.id.to_s == unit_id }
            return render json: { message: "Invalid Unit ID", status: 'failed', code: 404 }, status: :not_found unless unit

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

        private

        def load_all_properties
          @communities = Community.active_client_properties
          @companies   = Company.where(id: @communities.pluck(:company_id))
        end

        def load_property
          property_id = params[:propertyId].to_s
          return render json: { message: MISSING_PROPERTY_MESSAGE, status: 'failed', code: 400 }, status: :bad_request if property_id.blank?

          @community = @communities.find { |c| c.id.to_s == property_id }
          return render json: { message: INVALID_PROPERTY_MESSAGE, status: 'failed', code: 404 }, status: :not_found unless @community
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