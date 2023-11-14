module DataProviders
  module PropertyDetails
    class BaseService

      def initialize(community_id)
        return unless community_id.present?
        @community = Community.find_by_id community_id
        @credential = @community.credential
        return unless (@community.present? || @credential.present?)
      end
    end
  end
end