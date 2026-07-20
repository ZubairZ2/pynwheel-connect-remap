class PropertyDestroyWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'delete_data', retry: 1

  def perform(community_id)
    return unless community_id.present?

    begin
      community = Community.find_by_id community_id

      tours = Tour.where(community_id: community&.id )
      OpeningHour.where(community_id: community&.id).destroy_all
      GuidedOpeningHour.where(community_id: community&.id).destroy_all
      Gallery.where(community_id: community&.id).destroy_all
      CommunityUser.where(community_id: community&.id).destroy_all
      Feedback.where(tour_id: tours.pluck(:id) ).destroy_all
      Credential.where(community_id: community&.id).destroy_all
      PynwheelAccessUser.where(community_id: community&.id ).destroy_all
      Igloohome.where(community_id: community&.id ).destroy_all
      tours.destroy_all
      
      community.destroy
      
    rescue => error
      raise error
    end
  end
end