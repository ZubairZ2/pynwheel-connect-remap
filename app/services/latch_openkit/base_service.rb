module LatchOpenkit
  class BaseService

    def initialize(tour_user)
      @tour_user = tour_user
    end

    private

      def set_parameter_for_latch(community_id, start_time, end_time, key_ids)
        @latch = Latch.find_by(community_id: community_id)
        return unless @latch.present?

        LatchGuest.where(tour_user_id: @tour_user.id, community_id: community_id).update_all(status: "deleted")
        
        @community_id = community_id
        @start_time = start_time
        @end_time = end_time
        @key_ids = key_ids
      end
  end
end