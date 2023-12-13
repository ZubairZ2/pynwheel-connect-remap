class DeleteCompanyJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(company)
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
  end
end
