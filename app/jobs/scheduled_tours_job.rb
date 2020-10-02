class ScheduledToursJob < ApplicationJob
    include SuckerPunch::Job
  
    def perform(subject, data, community)
        ScheduledToursMailer.schuduled_tours_email(subject, data, community).deliver_now
    end
end