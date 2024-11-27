module Api
  module Partner
    module Maps
      class MapsController < BaseController
        MISSING_KEY_MESSAGE = 'API key is missing. Please provide a valid API key in the X-API-Key header.'
        INVALID_KEY_MESSAGE = 'Invalid API key. Please provide the correct API key.'

        before_action :load_map_partners
        before_action :validate_api_key
        before_action :load_related_data

        def all_maps
          render json: { companies: formatted_response, message: "Registered companis & communities maps data", status: 'success', code: 200 }
        end

        private

        def validate_api_key
          api_key = request.headers['X-API-Key']
          return render json: { message: MISSING_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized if api_key.blank?
          return render json: { message: INVALID_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized unless @registered_api_keys.include?(api_key)

          @current_api_key = api_key
        end

        def load_map_partners
          @registered_api_keys ||= MapPartner.pluck(:api_key).uniq
        end

        def load_related_data
          @map_partners = MapPartner.where(api_key: @current_api_key)
          @communities = Community.where(id: @map_partners.pluck(:community_id).compact.uniq)
          @companies = Company.where(id: @communities.pluck(:company_id).compact.uniq)
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
                  'map_embed_code' => community.map_embed_code,
                  'map_link' => community.map_link
                }
              end
            }
          end
        end
      end
    end
  end
end
