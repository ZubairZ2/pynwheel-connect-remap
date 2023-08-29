module Api
  module Touch
    module V1
      class CommunitiesController < BaseController
        
        def get_neighbourhood_data
          data_service = GoogleNeighbourhoodService.new(params)
          response = data_service.call
          render response
        end
        
      end
    end
  end
end