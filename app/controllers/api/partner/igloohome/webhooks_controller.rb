module Api
  module Partner
    module Igloohome
      class WebhooksController < BaseController

        def igloo_auth_code
          puts "\n\n\n\n\n Igloo Auth Code Called with params: \n #{params.inspect} \n\n\n\n\n"
          render json: { message: "Igloo Auth Code API executed successfully!", status: 200 }
        end
      end
    end
  end
end