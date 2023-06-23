module LatchOpenkit
  class BaseService
    attr_reader :community_id, :start_time, :end_time, :key_ids
            :tour_user, :allow_key_card_count

    def initialize(community_id, start_time, end_time, key_ids, tour_user, allow_key_card_count)
      @latch = Latch.find_by(community_id: community_id)
      return unless @latch.present?

      @community_id = community_id
      @start_time = start_time
      @end_time = end_time
      @key_ids = key_ids
      @tour_user = tour_user
      @allow_key_card_count = allow_key_card_count

      @partner_scopped_token = nil
      @user_scopped_token = nil
    end
  end
end