class PsiSendMitsLeadsJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, end_time, visited_stops, community)
        send_mits_leads_service = PsiSendMitsLeadsService.new(JSON.parse(credentials))
        send_mits_leads_service.perform(tour_user, tour_time, end_time, visited_stops, community)
    end
end