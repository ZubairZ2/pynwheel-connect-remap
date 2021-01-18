class RealPageInsertActivityJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, available_stops)
        real_page_insert_activity_service = RealPageInsertActivityService.new(JSON.parse(credentials))
        real_page_insert_activity_service.perform(tour_user, tour_time, available_stops, community)
    end
end