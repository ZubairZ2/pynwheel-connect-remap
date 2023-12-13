class DeleteCompanyJob < ApplicationJob
  #queue_as :default
  include SuckerPunch::Job

  def perform(company)
    tours = Tour.where(community_id: company.communities.pluck(:id) )
    Feedback.where(tour_id: tours.pluck(:id) ).destroy_all
    Credential.where(community_id: company.communities.pluck(:id)).destroy_all
    Credential.where(company_id: company.id).destroy_all
    CompanySetting.where(company_id: company.id).destroy_all
    pynwheeel_access_users = PynwheelAccessUser.where(community_id: company.communities.pluck(:id) )
    pynwheeel_access_users.destroy_all
    company.destroy
  end
end
