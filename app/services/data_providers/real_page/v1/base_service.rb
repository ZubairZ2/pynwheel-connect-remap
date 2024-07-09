module DataProviders
  module RentCafe
    module V1
      class BaseService

        def initialize(community_id)
          return unless community_id.present?
          @community_id = community_id
          @community = Community.find_by_id community_id
          @credential = @community&.credential if @community.present?
          @batch_size = 10
          
          return nil unless (@community.present? && @credential.present?)
        end
        
      end
    end
  end
end