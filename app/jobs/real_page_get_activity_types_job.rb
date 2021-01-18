class RealPageGetActivityTypesJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_status,community)
        real_page_get_activity_types_service = RealPageGetActivityTypesService.new(JSON.parse(credentials))
        real_page_get_activity_types_service.perform(tour_status,community)
    end
end