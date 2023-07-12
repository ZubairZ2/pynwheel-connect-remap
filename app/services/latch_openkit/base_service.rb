module LatchOpenkit
  class BaseService

    def initialize(tour_user, community_id)
      @latch = Latch.find_by(community_id: community_id)
      return unless @latch.present?

      @tour_user = tour_user
      @community_id = community_id
    end

    private

      def set_parameter_for_latch(start_time, end_time, key_ids)
        LatchGuest.where(tour_user_id: @tour_user.id, community_id: @community_id).update_all(status: "deleted")
        
        @start_time = start_time
        @end_time = end_time
        @key_ids = key_ids
      end
  end
end