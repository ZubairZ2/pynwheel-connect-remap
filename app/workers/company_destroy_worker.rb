class CompanyDestroyWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'delete_data', retry: 1

  def perform(company_id)
    return unless company_id.present?
    begin
      company = Company.find_by_id company_id

      community_ids = company.communities.pluck(:id)
      tours = Tour.where(community_id: community_ids )
      OpeningHour.where(community_id: community_ids).destroy_all
      GuidedOpeningHour.where(community_id: community_ids).destroy_all
      Gallery.where(community_id: community_ids).destroy_all
      CommunityUser.where(community_id: community_ids).destroy_all
      Feedback.where(tour_id: tours.pluck(:id) ).destroy_all
      Credential.where(community_id: community_ids).destroy_all
      PynwheelAccessUser.where(community_id: community_ids ).destroy_all
      tours.destroy_all
      
      Credential.where(company_id: company.id).destroy_all
      CompanySetting.where(company_id: company.id).destroy_all
      company.destroy
    rescue => error
      raise error
    end
  end
end