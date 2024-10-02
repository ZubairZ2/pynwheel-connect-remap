module Api
  module V1
    class BaseController < ActionController::Base
      around_action :logging_trail 

      def logging_trail
        begin
          # Replace with worker
          ::Log::Impression.new(requester: request).request_filler
          yield
          # Replace with worker
          ::Log::Impression.new(requester: response).response_filler
        rescue Exception => ex
          # Replace with worker
          ::Log::Impression.new(requester: response, exception: ex).exception_filler
        end
      end 
    end
  end
end