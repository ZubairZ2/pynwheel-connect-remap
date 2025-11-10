module Api
  module Partner
    module Maps
      class MapsController < BaseController
        MISSING_KEY_MESSAGE = 'API key is missing. Please provide a valid API key in the X-API-Key header.'
        INVALID_KEY_MESSAGE = 'Invalid API key. Please provide the correct API key.'

        MISSING_PROPERTY_MESSAGE = 'Property ID is missing. Please provide a valid propertyId parameter.'
        INVALID_PROPERTY_MESSAGE = 'Invalid Property ID. The property does not exist or is not associated with your API key.'

        PARTNERS = [
          { name: "rent", key: ENV["PARTNER_RENT_API_KEY"] },
          { name: "apartmentlist", key: ENV["PARTNER_APARTMENTLIST_API_KEY"] }
        ]

        before_action :load_map_partners
        before_action :validate_api_key
        before_action :load_partner_name
        before_action :load_related_data
        before_action :load_property, only: [:units]

        def all_maps
          render json: { 
            companies: formatted_response,
            message: "Registered companis & communities maps data",
            status: 'success', code: 200
          }
        end

        def properties
          render json: { 
            propertiesList: properties_response,
            message: "Properties list",
            status: 'success',
            code: 200
          }
        end

        def properties
          property_id = params[:propertyId].to_s

          if property_id.present?
            community = @communities.find { |c| c.id.to_s == property_id }

            if community
              render json: {
                propertyDetails: single_property_response(community),
                message: "Property details",
                status: 'success',
                code: 200
              }
            else
              render json: { message: INVALID_PROPERTY_MESSAGE, status: 'failed', code: 404 }, status: :not_found
            end
          else
            render json: {
              propertiesList: properties_response,
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

            if unit
              render json: {
                unitDetails: single_unit_response(unit, @community),
                message: "Unit details for property ID: #{@community.id}",
                status: 'success',
                code: 200
              }
            else
              render json: { message: "Invalid Unit ID. The unit does not exist for this property.", status: 'failed', code: 404 }, status: :not_found
            end
          else
            render json: {
              unitsList: units_response(@community),
              message: "Units for property ID: #{@community.id}",
              status: 'success',
              code: 200
            }
          end
        end

        private

        def validate_api_key
          api_key = request.headers['X-API-Key']
          return render json: { message: MISSING_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized if api_key.blank?
          return render json: { message: INVALID_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized unless @registered_api_keys.include?(api_key)

          @api_key = api_key
        end

        def load_map_partners
          @registered_api_keys ||= MapPartner.pluck(:api_key).uniq
        end

        def load_partner_name
          partner = PARTNERS.find { |p| p[:key] == @api_key }
          @partner = partner ? partner[:name] : nil
        end

        def load_related_data
          @map_partners = MapPartner.where(api_key: @api_key)
          @communities = Community.where(id: @map_partners.pluck(:community_id).compact.uniq)
          @companies = Company.where(id: @communities.pluck(:company_id).compact.uniq)
        end

        def load_property
          property_id = params[:propertyId].to_s

          if property_id.blank?
            return render json: { message: MISSING_PROPERTY_MESSAGE, status: 'failed', code: 400 }, status: :bad_request
          end

          @community = @communities.find { |c| c.id.to_s == property_id }

          unless @community
            return render json: { message: INVALID_PROPERTY_MESSAGE, status: 'failed', code: 404 }, status: :not_found
          end
        end


        def formatted_response
          @companies.map do |company|
            {
              'id' => company.id,
              'name' => company.name,
              'communities' => @communities.select { |community| community.company_id == company.id }.map do |community|
                {
                  'id' => community.id,
                  'name' => community.name,
                  'address' => community.make_address,
                  'partner' => @partner,
                  'map_embed_code' => community.map_embed_code(@partner),
                  'map_link' => community.map_link(@partner)
                }
              end
            }
          end
        end

        def single_property_response(community)
          {
            'propertyId' => community.id,
            'propertyName' => community.name,
            'companyId' => community.company_id,
            'companyName' => community&.company&.name,
            'fullAddress' => community.make_address,
            'address' => community.address,
            'city' => community.city,
            'state' => community.state,
            'zip' => community.zip
          }
        end

        def single_unit_response(unit, community)
          {
            'unitNumber' => unit.marketing_name,
            'mapId' => community.id, #community.is_sitemap? ? community&.sitemap&.id : unit&.floorplate_id,
            'assetId' => unit.id,
            'buildingId' => unit.building,
            'buildingName' => unit.building,
            'floorId' => unit.floor,
            'floorName' => unit.floor,
            'floorplanId' => unit.floorplan_id
          }
        end


        def properties_response
          @communities.map { |community| single_property_response(community) }
        end

        def units_response(community)
          units = community.units.map_units(community)

          return [] if units.blank?

          units.map { |unit| single_unit_response(unit, community) }
        end
      end
    end
  end
end
