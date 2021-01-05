class SalesforceSendFeedbackJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(community, tour_user, tour_history)
        SalesforceServices::TourFeedback.call(community: community, tour_user: tour_user, tour_history: tour_history)
    end
end
  