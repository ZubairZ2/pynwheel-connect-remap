class RealPageGetLeasingAgentsJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, community)
        real_page_get_leasing_agents_service = RealPageGetLeasingAgentsService.new(JSON.parse(credentials))
        real_page_get_leasing_agents_service.perform community
    end
end