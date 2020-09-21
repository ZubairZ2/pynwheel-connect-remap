class RealPageGuestCardIntegrationJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, end_time, tour_status, available_stops, visited_stops)

        cred = JSON.parse(credentials)
        community = Community.find_by_id cred["community_id"]
        prospect = Prospect.where(tour_user_id: tour_user.id, community_id: community.id,  data_provider: community.data_provider).last if community.present?
        
        # if prospect.present?
        #     real_page_insert_prospect_service = RealPageUpdateProspectService.new(JSON.parse(credentials))
        #     real_page_insert_prospect_service.perform(tour_user, tour_time, prospect)
        # else

        unless prospect.present?
            real_page_insert_prospect_service = RealPageInsertProspectService.new(JSON.parse(credentials))
            real_page_insert_prospect_service.perform(tour_user, tour_time, "")            # marketing_source is nil for unscheduled tour
        end

        # No need to call get_leasing_agents API, we will always be seeding "House" value "0" as a leasing agentg
        # real_page_get_leasing_agents_service = RealPageGetLeasingAgentsService.new(JSON.parse(credentials))
        # leasing_agent = real_page_get_leasing_agents_service.perform
        
        leasing_agent = {:Value=>"0", :Text=>"House"}   # expected everytime

        puts '-------------------------------  leasing_agent in job  ------------------------------------'
        puts leasing_agent
        puts '-------------------------------------------------------------------------------------------'
        
        real_page_get_activity_types_service = RealPageGetActivityTypesService.new(JSON.parse(credentials))
        activity_types = real_page_get_activity_types_service.perform(tour_status)
        
        visited_stops.each do |visited_stop|
            
            real_page_insert_activity_service = RealPageInsertActivityService.new(JSON.parse(credentials))
            activity_id = real_page_insert_activity_service.perform(tour_user, tour_time, available_stops, leasing_agent, activity_types)
            
            puts '-------------------------------  activity_id in job (loop)  --------------------------------'
            puts activity_id
            puts '--------------------------------------------------------------------------------------------'
            
            real_page_insert_unit_shown_service = RealPageInsertUnitShownService.new(JSON.parse(credentials))
            real_page_insert_unit_shown_service.perform(tour_user, tour_time, visited_stop, leasing_agent, activity_id)

        end


        real_page_insert_follow_up_service = RealPageInsertFollowUpService.new(JSON.parse(credentials))
        real_page_insert_follow_up_service.perform(tour_user, tour_time, end_time, leasing_agent)
    end
end