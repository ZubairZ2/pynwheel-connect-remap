class RealPageGuestCardIntegrationJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, end_time, tour_status, available_stops, visited_stops, community)
        cred = JSON.parse(credentials)
        community = Community.find_by_id cred["community_id"]
        visited_stops = stop_marketing_names_visited_by_user(tour_user.id, community.tour.id)
        prospect = Prospect.where(tour_user_id: tour_user.id, community_id: community.id,  data_provider: community.data_provider).last if community.present?
        
        # if prospect.present?
        #     real_page_insert_prospect_service = RealPageUpdateProspectService.new(JSON.parse(credentials))
        #     real_page_insert_prospect_service.perform(tour_user, tour_time, prospect)
        # else

        unless prospect.present?
            real_page_insert_prospect_service = RealPageInsertProspectService.new(JSON.parse(credentials))
            real_page_insert_prospect_service.perform(tour_user, tour_time, "", "", community)            # marketing_source, desired_move_in_date are nil for unscheduled tour
        end

        # No need to call get_leasing_agents API, we will always be seeding "House" value "0" as a leasing agentg
        # real_page_get_leasing_agents_service = RealPageGetLeasingAgentsService.new(JSON.parse(credentials))
        # leasing_agent = real_page_get_leasing_agents_service.perform
        
        leasing_agent = {:Value=>"0", :Text=>"House"}   # expected everytime

        puts '-------------------------------  leasing_agent in job  ------------------------------------'
        puts leasing_agent
        
        real_page_get_activity_types_service = RealPageGetActivityTypesService.new(JSON.parse(credentials))
        activity_types = real_page_get_activity_types_service.perform(tour_status, community)
        
        visited_stops.each do |visited_stop|
            
            real_page_insert_activity_service = RealPageInsertActivityService.new(JSON.parse(credentials))
            activity_id = real_page_insert_activity_service.perform(tour_user, tour_time, available_stops, leasing_agent, activity_types, community)
            
            puts '-------------------------------  activity_id in job (loop)  --------------------------------'
            puts activity_id
            
            real_page_insert_unit_shown_service = RealPageInsertUnitShownService.new(JSON.parse(credentials))
            real_page_insert_unit_shown_service.perform(tour_user, tour_time, visited_stop, leasing_agent, activity_id, community)

        end


        real_page_insert_follow_up_service = RealPageInsertFollowUpService.new(JSON.parse(credentials))
        real_page_insert_follow_up_service.perform(tour_user, tour_time, end_time, leasing_agent, community)
    end

    def stop_marketing_names_visited_by_user(tour_user_id, tour_id)
		visited_stops = []

		current_tour = VisitedStop.where(tour_user_id: tour_user_id, tour_id: tour_id).last
		tour_key = current_tour.tour_key if current_tour.present?
		if tour_key.present?
			tour_stop_ids = VisitedStop.where(tour_key: tour_key).pluck(:tour_stop_id)
			unit_stops = TourStop.where(id: tour_stop_ids, stop_type: "unit").pluck(:stop_id)

			unit_stops.each do |stop_id|
				unit = Unit.find_by_id stop_id
				marketing_name = unit.marketing_name
				visited_stops << marketing_name if unit.present?
			end
		end
        puts "<<<<<<<<<<    visited_stops in background job >>>>>>>>>>>>>>>>"
		puts visited_stops
		return visited_stops
	end
end