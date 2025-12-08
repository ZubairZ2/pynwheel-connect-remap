module Api
  module Partner
    module Maps
      class BaseController < ActionController::Base

        MISSING_KEY_MESSAGE     = 'API key is missing. Please provide a valid API key in the X-API-Key header.'
        INVALID_KEY_MESSAGE     = 'Invalid API key. Please provide the correct API key.'
        MISSING_PROPERTY_MESSAGE = 'Property ID is missing. Please provide a valid propertyId parameter.'
        INVALID_PROPERTY_MESSAGE = 'Invalid Property ID. The property does not exist or is not associated with your API key.'

        PARTNERS = [
          { name: "rent", key: ENV["PARTNER_RENT_API_KEY"] },
          { name: "apartmentlist", key: ENV["PARTNER_APARTMENTLIST_API_KEY"] }
        ]

        before_action :load_map_partners
        before_action :validate_api_key
        before_action :load_partner_name

        # around_action :logging_trail


        def load_map_partners
          @registered_api_keys ||= MapPartner.pluck(:api_key).uniq
        end

        def validate_api_key
          api_key = request.headers['X-API-Key']
          return render json: { message: MISSING_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized if api_key.blank?
          return render json: { message: INVALID_KEY_MESSAGE, status: 'failed', code: 401 }, status: :unauthorized unless @registered_api_keys.include?(api_key)

          @api_key = api_key
        end

        def load_partner_name
          partner = PARTNERS.find { |p| p[:key] == @api_key }
          @partner = partner ? partner[:name] : nil
        end

        # def logging_trail
        #   begin
        #     Log::Impression.new(requester: request).request_filler
        #     yield
        #     Log::Impression.new(requester: response).response_filler
        #   rescue Exception => ex
        #     Log::Impression.new(requester: response, exception: ex).exception_filler
        #   end
        # end
      end
    end
  end
end