class RealPageInsertUnitShownJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(credentials, tour_user, tour_time, visited_stops)
        real_page_insert_unit_shown_service = RealPageInsertUnitShownService.new(JSON.parse(credentials))
        real_page_insert_unit_shown_service.perform(tour_user, tour_time, visited_stops)
    end
end
  