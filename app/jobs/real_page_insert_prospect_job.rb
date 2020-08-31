class RealPageInsertProspectJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time)
        real_page_insert_prospect_service = RealPageInsertProspectService.new(JSON.parse(credentials))
        real_page_insert_prospect_service.perform(tour_user, tour_time)
    end
end
  