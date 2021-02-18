class RealPageInsertFollowUpJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, end_time, community)
        real_page_insert_follow_up_service = RealPageInsertFollowUpService.new(JSON.parse(credentials))
        real_page_insert_follow_up_service.perform(tour_user, tour_time, end_time, community)
    end
end
  