class RealPageGuestCardIntegrationJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, end_time, available_stops, visited_stops)

        real_page_insert_prospect_service = RealPageInsertProspectService.new(JSON.parse(credentials))
        real_page_insert_prospect_service.perform(tour_user)

        real_page_get_leasing_agents_service = RealPageGetLeasingAgentsService.new(JSON.parse(credentials))
        leasing_agent = real_page_get_leasing_agents_service.perform
        
        real_page_get_activity_types_service = RealPageGetActivityTypesService.new(JSON.parse(credentials))
        activity_type = real_page_get_activity_types_service.perform

        real_page_insert_activity_service = RealPageInsertActivityService.new(JSON.parse(credentials))
        activity_id = real_page_insert_activity_service.perform(tour_user, tour_time, available_stops, leasing_agent, activity_type)

        real_page_insert_unit_shown_service = RealPageInsertUnitShownService.new(JSON.parse(credentials))
        real_page_insert_unit_shown_service.perform(tour_user, tour_time, visited_stops, leasing_agent, activity_id)

        real_page_insert_follow_up_service = RealPageInsertFollowUpService.new(JSON.parse(credentials))
        real_page_insert_follow_up_service.perform(tour_user, tour_time, end_time, leasing_agent)
    end
end
  