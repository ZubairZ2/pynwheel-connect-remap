module Api
  module Partner
    module Maps
      class WebhooksController < BaseController
        
        before_action :load_property_for_units, only: [:units]

        # --------------------------------------------------
        # GET /api/partner/maps/properties
        # --------------------------------------------------
        def properties
          property_id = params[:propertyId].to_s

          if property_id.present?
            # FAST: Fetch only 1 record, no scopes
            community = Community.select(:id, :name, :company_id, :address, :city, :state, :zip)
                                 .find_by(id: property_id)

            unless community
              return render json: {
                message: INVALID_PROPERTY_MESSAGE,
                status: "failed",
                code: 404
              }, status: :not_found
            end

            # Lazy-load company only when needed
            company = community.company

            return render json: {
              propertyDetails: {
                propertyId: community.id,
                propertyName: community.name,
                companyId: community.company_id,
                companyName: company&.name,
                fullAddress: community.make_address,
                address: community.address,
                city: community.city,
                state: community.state,
                zip: community.zip
              },
              message: "Property details",
              status: "success",
              code: 200
            }
          end

          # --------------------------------------------------
          # LIST ALL PROPERTIES — optimized
          # --------------------------------------------------
          communities = Community.active_client_properties
                                 .select(:id, :name, :company_id, :address, :city, :state, :zip)
                                 .includes(:company)

          properties_list = communities.map do |c|
            {
              propertyId: c.id,
              propertyName: c.name,
              companyId: c.company_id,
              companyName: c.company&.name,
              fullAddress: c.make_address,
              address: c.address,
              city: c.city,
              state: c.state,
              zip: c.zip
            }
          end

          render json: {
            propertiesList: properties_list,
            message: "All properties list",
            status: "success",
            code: 200
          }
        end

        # --------------------------------------------------
        # GET /api/partner/maps/units
        # --------------------------------------------------
        def units
          unit_id = params[:unitId].to_s

          if unit_id.present?
            unit = @community.units.find_by(id: unit_id)

            unless unit
              return render json: {
                message: "Invalid Unit ID",
                status: "failed",
                code: 404
              }, status: :not_found
            end

            return render json: {
              unitDetails: format_unit(unit, @community),
              message: "Unit details",
              status: "success",
              code: 200
            }
          end

          units_list = @community.units.map { |u| format_unit(u, @community) }

          render json: {
            unitsList: units_list,
            message: "Units list",
            status: "success",
            code: 200
          }
        end

        private

        # --------------------------------------------------
        # FAST loader for property used in units API
        # --------------------------------------------------
        def load_property_for_units
          property_id = params[:propertyId].to_s

          if property_id.blank?
            return render json: {
              message: MISSING_PROPERTY_MESSAGE,
              status: "failed",
              code: 400
            }, status: :bad_request
          end

          @community = Community
                        .select(:id, :name, :company_id, :address, :city, :state, :zip)
                        .includes(:units)
                        .find_by(id: property_id)

          if @community.nil?
            return render json: {
              message: INVALID_PROPERTY_MESSAGE,
              status: "failed",
              code: 404
            }, status: :not_found
          end
        end

        # --------------------------------------------------
        # UNIT FORMATTER
        # --------------------------------------------------
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