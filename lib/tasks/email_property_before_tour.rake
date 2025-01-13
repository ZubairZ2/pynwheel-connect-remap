namespace :email_property_before_tour do
  include Rails.application.routes.url_helpers
  default_url_options[:host] = 'https://pynwheelconnect.com' 
  desc 'email to the property all today tour'
  task :send_email => :environment do
    Community.where(self_tour: true).each do |community|
      tours_data = []

      community_time = Time.now.in_time_zone(community.get_time_zone(DEFAULT_TIME_ZONE))
      today_date =  community_time.to_date.strftime("%m/%d/%Y") 

      SchedualTour.where(community_id: community.id, tour_date: community_time.to_date.strftime("%Y-%m-%d") ).order('tour_time').each do |scheduled_tour|
          
        if scheduled_tour.tour_user_id.present?
          tour_user = scheduled_tour.tour_user
          
          unless scheduled_tour.community_inform_email
            name = (tour_user.first_name.present? and tour_user.last_name.present?) ? (tour_user.first_name.capitalize + " " + tour_user.last_name.capitalize) :  tour_user.name.titleize
            text = name + " has a scheduled tour at " + scheduled_tour.tour_time.strftime("%l:%M %P") + " on #{today_date}"
            tours_data << text
            mark_tour_user(scheduled_tour)
          end

        end
      end
      
      ScheduledToursJob.perform_async("Scheduled Tours for #{today_date}", tours_data, community) if tours_data.present?
    end
  end

  def mark_tour_user(scheduled_tour)
      scheduled_tour.update(community_inform_email: true)
  end
end