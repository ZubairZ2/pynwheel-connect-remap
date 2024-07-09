module DataProviders
  module RealPage
    class V1ApisService
      def initialize(community_id)
        return unless community_id.present?

        @community = Community.find_by_id(community_id)
        @credential = @community&.credential if @community.present?

        return unless @credential.present?

      end

      private

      def get_apartment_availability
        
      end


    end
  end
end