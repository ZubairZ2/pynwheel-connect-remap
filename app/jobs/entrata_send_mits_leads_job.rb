class EntrataSendMitsLeadsJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, current_time)
        send_mits_leads_service = EntrataSendMitsLeadsService.new(JSON.parse(credentials))
        send_mits_leads_service.perform(tour_user, current_time)
    end
end