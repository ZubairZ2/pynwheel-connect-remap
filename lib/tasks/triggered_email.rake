namespace :triggered_email do
  desc 'Missed email triggered'
  task :missed_tour => :environment do
    @time_hash = {}
    tours = SchedualTour.where(tour_date: [(Date.today - 1)..(Date.today + 1)], is_tour_completed: false).where.not(tour_user_id: nil)

    tours.each do |tour|
      community = Community.find tour.community_id
      schedule_tour = SchedualTour.find_by community_id: community.id
      tu = TourUser.find tour.tour_user_id
      timezone = community.get_time_zone()
      current_time = Time.now.in_time_zone(timezone)
      diff = current_time.to_s(:time).to_time - tour.tour_time.to_s(:time).to_time 
      th = TourHistory.where(arrived: [(current_time - 7200)..current_time], tour_id: community.community_tour.id, tour_user_id: tu.id)
      
      if diff > 7200 && !th.present? && !tour.missed_email_sent && current_time.to_date == tour.tour_date
        FunnelService.new(tour).update_appointment_status("no-show") if community.is_funnel_community?
        
        base_url =  Rails.env.development? ? "localhost:3000/" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-staging.herokuapp.com/" : "https://pynwheelconnect.com/") #"https://pynwheelapp.com/"
        email_msg = "#{tu.name.titleize} missed a scheduled tour!<br><br>Tour scheduled: #{tour.tour_date.strftime('%Y-%m-%d')}/#{tour.tour_time.strftime('%I:%M %p')}<br><br>We have sent them a message asking if they would like to reschedule. Here is their contact information in case you want to follow up: <br><br><a href='mailto:#{tu.email}'>#{tu.email}</a><br><a href='tel:#{tu.phone_number}'>#{tu.phone_number}</a><br><Link to user’s profile>"
        profileUserLink = base_url + "communities/#{community.id}/scheduled_tours?userSearch=" + tu.email
        email_msg = "#{tu.name.titleize} missed a scheduled tour!<br><br>Tour scheduled: #{tour.tour_date.strftime('%Y-%m-%d')}/#{tour.tour_time.strftime('%I:%M %p')}
        <br><br>
        We have sent them a message asking if they would like to reschedule. Here is their contact information in case you want to follow up: 
        
        <br><br><a href='mailto:#{tu.email}'>#{tu.email}</a>

        <br><br><a href='tel:#{tu.phone_number}'>#{tu.phone_number}</a>
        
        <br><br><a href='#{profileUserLink}'>Link to user's profile</a>"

        tour.update_column 'missed_email_sent', true
        emails = community.email.split(',')

        unless tu.is_virtual_tour?
          emails.each do |email|
            ScheduledTourMailerJob.perform_async("Missed a scheduled tour!", email_msg, email,community,nil,nil,nil,nil,false,schedule_tour) if community&.crm_credential&.crm_provider != "salesforce"
          end
        end  

        # community_code = get_community_code community
        
        scheduler_link = tour.get_schedule_tour_url() #{}"#{base_url}scheduler_widget/test_widget?scheduled_tour_id=#{schedule_tour.id}&community_id=#{community.id}&tour_user_id=#{tu.id}&reschedule_tour=true&direct=true&community_code=#{community_code}"
        reschedule_appointment_button = "<a href='#{scheduler_link}' target='_blank' style='margin-top: 25px;margin-bottom: 10px;color: #FFFFFF; font-size: 16px; line-height:22.37px;font-weight: 700;-webkit-text-size-adjust: none;text-align: center; text-decoration: none;display: inline-block;overflow-wrap: break-word;word-break: break-word; word-wrap:break-word; mso-border-alt: none; box-sizing: border-box;font-family:arial,helvetica,sans-serif;background-color: #3f9d6d; '>	<span style='display:block;padding:10px 20px;line-height:140%;'><span style='font-family:arial,helvetica,sans-serif; font-size: 20px; line-height:30px;'><b><span style='line-height: 30px; font-size: 20px;'>Reschedule My Tour!</span></b></span></span></a>"

        email_msg_with_st = "Hi, #{tu.name.titleize}. It looks like you missed your scheduled tour at #{community.name}. We would hate for you to miss out on an opportunity to find your perfect home. Please click the link below to reschedule.<br><br><div>#{reschedule_appointment_button}</div><br><br>Thank you!"
        
        text_msg_with_st = "Hi, #{tu.name.titleize}. It looks like you missed your scheduled tour at #{community.name}. We would hate for you to miss out on an opportunity to find your perfect home. #{"\n"}#{"\n"}Please click the link below to reschedule:#{"\n"}
#{scheduler_link}
#{"\n"}#{"\n"}Thank you!"
        
        email_msg_no_st_tour_user = "Hi, #{tu.name.titleize}. It looks like you missed your scheduled tour at #{community.name}. We would hate for you to miss out on an opportunity to find your perfect home. Please contact us to reschedule: 
        <br><a href='mailto:#{community.email.present? ? community.email : ""}'>#{community.email.present? ? community.email : ""}</a>
        <br><a href='tel:#{community.phone.present? ? community.phone : ""}'>#{community.phone.present? ? community.phone : ""}</a>
        "

        text_msg_no_st_tour_user = "Hi, #{tu.name.titleize}. It looks like you missed your scheduled tour at #{community.name}. We would hate for you to miss out on an opportunity to find your perfect home. Please contact us to reschedule: 
        #{community.phone.present? ? community.phone : ""}
        #{community.email.present? ? community.email : ""}"
        
        if community.scheduler_widget
          sleep 1

          ScheduledTourMailerJob.perform_async("Missed a scheduled tour!", email_msg_with_st, tu.email,community,nil,nil,nil,emails[0],true,schedule_tour) if community.crm_credential.crm_provider != "salesforce"
          TwilioSmsWorker.perform_async(text_msg_with_st, tu&.phone_number, tu&.email, community&.id) if tu.is_sms_enabled && community.crm_credential.crm_provider != "salesforce"
        else
          sleep 1
          
          ScheduledTourMailerJob.perform_async("Missed a scheduled tour!", email_msg_no_st_tour_user, tu.email,community,nil,nil,nil,emails[0],true,schedule_tour) if community.crm_credential.crm_provider != "salesforce"
          TwilioSmsWorker.perform_async(text_msg_no_st_tour_user, tu&.phone_number, tu&.email, community&.id) if tu.is_sms_enabled && community.crm_credential.crm_provider != "salesforce"
        end
      end
      
    end
  end

  def get_community_code community
    (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
  end

end