class RealPageInsertProspectJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user)
        real_page_gci_service = RealPageInsertProspectService.new(JSON.parse(credentials))
        real_page_gci_service.perform(tour_user)
    end
  end
  