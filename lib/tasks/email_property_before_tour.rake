namespace :email_property_before_tour do
    include Rails.application.routes.url_helpers
    default_url_options[:host] = 'https://pynwheelconnect.com' 
    desc 'email to the property all today tour'
    task :send_email => :environment do
        Community.where(self_tour: true).each do |community|
            
            community_time = Time.now.in_time_zone(community.get_time_zone())

            if community_time.present? and community_time.strftime("%H:%M") > "04:30" and community_time.strftime("%H:%M") < "05:30"
                tours_data = []
                SchedualTour.where(community_id: community.id, tour_date: Date.today).order('tour_time').each do |scheduled_tour|
                   
                    if scheduled_tour.tour_user_id.present?
                        tour_user = scheduled_tour.tour_user
                        unless scheduled_tour.community_inform_email
                            name = (tour_user.first_name.present? and tour_user.last_name.present?) ? (tour_user.first_name.capitalize + " " + tour_user.last_name.capitalize) :  tour_user.name.capitalize
                            text = name + " has a scheduled tour at " + scheduled_tour.tour_time.strftime("%l:%M %P") + " today."
                            tours_data << text
                            mark_tour_user(scheduled_tour)
                        end
                    end
                end
                ScheduledToursJob.perform_async("Sechduled Tours for #{Date.today.strftime("%Y-%m-%d")}", tours_data, community) if tours_data.present?
            end
        end
    end
    def mark_tour_user(scheduled_tour)
        scheduled_tour.update_attributes(community_inform_email: true)
    end
end