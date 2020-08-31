class RealPageGuestCardIntegrationJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, end_time, available_stops, visited_stops)

        cred = JSON.parse(credentials)
        community = Community.find_by_id cred["community_id"]
        prospect = Prospect.where(tour_user_id: tour_user.id, community_id: community.id,  data_provider: community.data_provider).last if community.present?
        
        unless prospect.present?
            real_page_insert_prospect_service = RealPageInsertProspectService.new(JSON.parse(credentials))
            real_page_insert_prospect_service.perform(tour_user, tour_time)
        end

        real_page_get_leasing_agents_service = RealPageGetLeasingAgentsService.new(JSON.parse(credentials))
        leasing_agent = real_page_get_leasing_agents_service.perform
        puts '-------------------------------  leasing_agent in job  ------------------------------------'
        puts leasing_agent
        puts '------------------------------------------------------------------------------------'
        real_page_get_activity_types_service = RealPageGetActivityTypesService.new(JSON.parse(credentials))
        activity_type = real_page_get_activity_types_service.perform
        puts '-------------------------------  activity_type in job  ------------------------------------'
        puts activity_type
        puts '------------------------------------------------------------------------------------'
        real_page_insert_activity_service = RealPageInsertActivityService.new(JSON.parse(credentials))
        activity_id = real_page_insert_activity_service.perform(tour_user, tour_time, available_stops, leasing_agent, activity_type)
        puts '-------------------------------  activity_id in job  ------------------------------------'
        puts activity_id
        puts '------------------------------------------------------------------------------------'
        real_page_insert_unit_shown_service = RealPageInsertUnitShownService.new(JSON.parse(credentials))
        real_page_insert_unit_shown_service.perform(tour_user, tour_time, visited_stops, leasing_agent, activity_id)

        real_page_insert_follow_up_service = RealPageInsertFollowUpService.new(JSON.parse(credentials))
        real_page_insert_follow_up_service.perform(tour_user, tour_time, end_time, leasing_agent)
    end
end