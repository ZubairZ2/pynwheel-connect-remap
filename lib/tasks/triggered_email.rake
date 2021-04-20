namespace :triggered_email do
  desc 'Missed email triggered'
  task :missed_tour => :environment do
    @time_hash = {}
    tours = SchedualTour.where(tour_date: [(Date.today - 1)..(Date.today + 1)]).where.not(tour_user_id: nil)
    tours.each do |tour|
      community = Community.find tour.community_id
      tu = TourUser.find tour.tour_user_id
      timezone = time_zone community
      current_time = Time.now.in_time_zone(timezone)
      diff = current_time.to_s(:time).to_time - tour.tour_time.to_s(:time).to_time
      th = TourHistory.where(arrived: [(current_time - 3600)..current_time], tour_id: community.tour.id, tour_user_id: tu.id)
      
      puts diff
      puts tour.id
      puts current_time
      puts timezone
      puts tour.tour_time.to_s(:time).to_time
      if diff > 3600 && !th.present? && !tour.missed_email_sent
        base_url =  Rails.env.development? ? "localhost:3000/" : (ENV["RAILS_ENV"] == "staging" ? "https://pynwheel-qa.herokuapp.com/" : "https://pynwheelapp.com/")
        email_msg = "#{tu.name.capitalize} missed a scheduled tour!<br><br>Tour scheduled: #{tour.tour_date.strftime('%Y-%m-%d')}/#{tour.tour_time.strftime('%I:%M %p')}<br><br>We have sent them a message asking if they would like to reschedule. Here is their contact information in case you want to follow up: <br><br><a href='mailto:#{tu.email}'>#{tu.email}</a><br><a href='tel:#{tu.phone_number}'>#{tu.phone_number}</a><br><Link to user’s profile>"
        profileUserLink = base_url + "communities/#{community.id}/schedual_tours?userSearch=" + tu.email
        sms_msg = "#{tu.name.capitalize} missed a scheduled tour!<br><br>Tour scheduled: #{tour.tour_date.strftime('%Y-%m-%d')}/#{tour.tour_time.strftime('%I:%M %p')}

        We have sent them a message asking if they would like to reschedule. Here is their contact information in case you want to follow up: 
        
        <a href='mailto:#{tu.email}'>#{tu.email}</a>

        <a href='tel:#{tu.phone_number}'>#{tu.phone_number}</a>
        
        <a href='#{profileUserLink}'>Link to user's profile</a>"

        tour.update_column 'missed_email_sent', true
        emails = community.email.split(',')
        emails.each do |email|
        DelayedSchedulerMailerJob.perform_async("Missed a scheduled tour!", email_msg, email,community,nil,nil,nil,emails[0],false)
        end

        

        community_code = get_community_code community
        scheduler_link = "#{base_url}scheduler_widget/test_widget?community_id=#{community.id}&community_code=#{community_code}&direct=true"
        email_msg_tour_user = "Hi, #{tu.name.capitalize}! It looks like you missed your scheduled tour at #{community.name}. We would hate for you to miss out on an opportunity to find your perfect home. Please click the link below to reschedule. <br><br><div style='align-item: center;'><a class='btn btn-success primary-button' href='#{scheduler_link}' id='sample_btn' style='align-items: center; display: inline-grid; font-size: 14px; padding: 5px; color: white; border-radius: 4px; width: 130px; height: 30px; background-color: rgb(32, 163, 69); font-family: &quot;Open Sans Regular&quot;;'' target='_blank'>Reschedule My Tour!</a></div><br><br>Thank you!"
        msg_msg_tour_user = "Hi, #{tu.name.capitalize}! It looks like you missed your scheduled tour at #{community.name}. We would hate for you to miss out on an opportunity to find your perfect home. Please contact us to reschedule: 
        #{community.phone.present? ? community.phone : ""}
        #{community.email.present? ? community.email : ""}
        "
        
        DelayedSchedulerMailerJob.perform_async("Missed a scheduled tour!", email_msg_tour_user, tu.email,community,nil,nil,nil,emails[0],true)
        DelayedSchedulerTextJob.perform_async(msg_msg_tour_user, tu.phone_number)
      end
      

    end
  end

  def time_zone community
    unless @time_hash[community.id].present?
      time_zone = Timezone.lookup(community.latitude, community.longitude)
      timezone = time_zone.name
      @time_hash[community.id] = timezone
      return timezone
    else
      @time_hash[community.id]
    end
    
  end
  def get_community_code community
    (JWT.encode ({"community_id" => community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')
  end

end