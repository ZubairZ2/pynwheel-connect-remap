class RealPageInsertProspectJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, appointment_time, marketing_source, desired_move_in_date, community)          # coming form scheduler widger, we are passing move-in-date for tour_time
        real_page_insert_prospect_service = RealPageInsertProspectService.new(JSON.parse(credentials))
        real_page_insert_prospect_service.perform(tour_user, appointment_time, marketing_source, desired_move_in_date, community)
    end
end
  