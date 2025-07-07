module DataProviders
  module AppFolio
    module V0
      class BaseService
        def initialize(community_id)
          begin
            @batch_size = 10
            @community_id = community_id
            @community = Community.find_by_id(community_id)
            @credential = @community&.credential if @community

            @app_folio_service = DataProviders::AppFolio::V0ApisService.new(@community_id)
            # @rent_manager_service.de_auth_api_token() # De authorize previous token
            # @rent_manager_service.generate_api_auth_token() # Create new authorize token
          rescue =>  error
            false
          end
        end

        def get_resource(property_code, resource)
          @app_folio_service.get_resource(property_code, resource)            
        end


        private
        




      end
    end
  end
end