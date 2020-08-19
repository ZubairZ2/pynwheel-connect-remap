class RealPageGuestCardIntegrationJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, end_time, available_stops, visited_stops)

        real_page_insert_prospect_service = RealPageInsertProspectService.new(JSON.parse(credentials))
        real_page_insert_prospect_service.perform(tour_user)

        real_page_insert_activity_service = RealPageInsertActivityService.new(JSON.parse(credentials))
        real_page_insert_activity_service.perform(tour_user, tour_time, available_stops)

        real_page_insert_unit_shown_service = RealPageInsertUnitShownService.new(JSON.parse(credentials))
        real_page_insert_unit_shown_service.perform(tour_user, tour_time, visited_stops)

        real_page_insert_follow_up_service = RealPageInsertFollowUpService.new(JSON.parse(credentials))
        real_page_insert_follow_up_service.perform(tour_user, tour_time, end_time)
    end
end
  