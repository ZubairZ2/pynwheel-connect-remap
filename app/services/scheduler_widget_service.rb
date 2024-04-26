class SchedulerWidgetService < BaseService
  def initialize(community)
    @community = community
    # @stepping = stepping
    # @tour_type = tour_Type
    # @requested_day = requested_day
    # @tour_date = tour_date
  end

  def time_slots_for_appartments(stepping,tour_type,requested_day,tour_date)
    time_slots ||= []
    available_time_slots ||=[]
    if @community&.community_tour&.tour_setting.present?
      tour_setting = @community.community_tour.tour_setting
      allow_self_tour = tour_setting.allow_self_tour
      allow_guided_tour = tour_setting.allow_guided_tour
      allow_virtual_tour = tour_setting.allow_virtual_tour
      if allow_virtual_tour && tour_type == "virtual_tour"
        each_day_slots = return_time_slots("0:00", "23:59",stepping)
        time_slots << each_day_slots
      else
        self_tour_data = (allow_self_tour && @community.opening_hours.present?) ? @community.opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if self_tour_data.present? && tour_type == "self_tour"
          self_tour_data.each do |data|
            if data[0] == requested_day 
              time_slots << return_time_slots(data[1], data[2], stepping)
            end
          end
        end
        guided_tour_data = (allow_guided_tour && @community.guided_opening_hours.present?) ? @community.guided_opening_hours.pluck(:day, :opening_time, :closing_time) : []
        if guided_tour_data.present? && tour_type == "guided_tour"
          guided_tour_data.each do |data|
            if data[0] == requested_day
              time_slots << return_time_slots(data[1], data[2], stepping)
            end
          end
        end
      end
    end
     
    timezone = @community.get_time_zone()
    today_datetime = Time.zone.now.utc.in_time_zone(timezone).strftime("%y/%m/%d %I:%M %A %p")
    d = Date.parse(tour_date) if tour_date.is_a? String 
    time_slots.flatten.each do |time|
      t = Time.zone.parse(time) if time.is_a? String
      time_slot_datetime = DateTime.new(d.year, d.month, d.day, t.hour, t.min).strftime("%y/%m/%d %I:%M %A %p") 
      if  time_slot_datetime.to_datetime >= today_datetime.to_datetime
        available_time_slots << time
      end
    end
    # available_time_slots.each {|value_arr| value_arr.uniq}
    available_time_slots
  end 

  # def return_2_hrs_time_interval_slots(opening_time, closing_time)
  # end

  def return_time_slots(opening_time, closing_time, steps)
    slots = []
    # if steps == 120
    #   slots = return_2_hrs_time_interval_slots(opening_time, closing_time)
    # else
      start_minute = opening_time
      opening_hour = opening_time.split(":")[0].to_i
      opening_minute = opening_time.split(":")[1].to_i
      open_minute = opening_minute
      closing_hour = closing_time.split(":")[0].to_i
      closing_minute = closing_time.split(":")[1].to_i == 0 ? 60 : closing_time.split(":")[1].to_i
      same_hour = (opening_hour == closing_hour)
      close_minute = same_hour ? closing_minute : 60
      while opening_minute < close_minute
        hour, am_pm = return_hour_and_meridiem(opening_hour)
        slots << (hour  + ":" + ((opening_minute < 10) ? "0" + opening_minute.to_s : opening_minute.to_s) + " " + am_pm)
        opening_minute += steps
      end
      opening_minute = same_hour ? 0 : (opening_minute - 60)
      opening_hour += 1
      if opening_hour != closing_hour
        while opening_hour <= (closing_hour - 1) do
          hour, am_pm = return_hour_and_meridiem(opening_hour)
          slots << (hour  + ":" + ((opening_minute < 10) ? "0" + opening_minute.to_s : opening_minute.to_s) + " " + am_pm)
            if (opening_minute + steps) < 60
              opening_minute += steps
            else
              opening_hour = opening_hour + 1
              opening_minute = (opening_minute + steps) - 60
            end
        end # while end
      end
      if !same_hour && closing_minute != 60 # means greater than zero
        open_minute = 0 if open_minute >= closing_minute
        while open_minute < closing_minute
          hour, am_pm = return_hour_and_meridiem(opening_hour)
          slots << (hour  + ":" + ((open_minute < 10) ? "0" + open_minute.to_s : open_minute.to_s) + " " + am_pm)
          open_minute += steps
        end
      end
    # end
    
    slots
  end # method end

  def return_hour_and_meridiem(hour)
    if hour == 0
      hour += 12
      return hour.to_s, "am"
    elsif hour < 10
      hour = "0" + hour.to_s
      return hour, "am"
    elsif hour < 12
      return hour.to_s, "am"
    elsif hour == 12
      return hour.to_s, "pm"
    elsif hour < 24
      hour = hour - 12
      return hour.to_s, "pm"
    end  
  end

  def send_email_and_other_notifications(schedual_tour, previous_tour, is_rescheduled)
    tu = schedual_tour.tour_user
    community = schedual_tour.community
    community_email = community.email.present? ? community.email : 'info@pynwheel.com'
    # app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
    app_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
    # android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
    android_link = (Company.find community.company_id).name.downcase == "lincoln" ? "http://onelink.to/6fsxvq" : "http://onelink.to/m5vuhn"
    
    app_link_web = (Company.find community.company_id).name.downcase == "lincoln" ? "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129" : "https://apps.apple.com/us/app/self-tour/id1488907392"
    android_link_web = (Company.find community.company_id).name.downcase == "lincoln" ? "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.selftour"
    if community.community_tour.tour_setting.enable_header_footer
      email_content = is_rescheduled ? "<div style='vertical-align:middle; text-align:center'><p style='font-weight: normal; font-size: 18px;'>Thank you <b>#{tu.name}</b> for rescheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: <br/></p> </div> <ul><li style='font-size: 18px;'>A photo ID</li> <li style='font-size: 18px;'>Your mobile device with the Pynwheel Tour app installed.</li></ul> <div style='vertical-align:middle; text-align:center'><p style='font-weight: normal; font-size: 18px;'><b>Please download Pynwheel Tour app before you arrive:</b></div>" : "<div style='vertical-align:middle; text-align:center'><p style='font-weight: normal; font-size: 18px;'> Thank you <b>#{tu.name}</b> for scheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on  <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: <br/></p></div> <ul><li style='font-size: 18px;'>A photo ID</li><li style='font-size: 18px;'>Your mobile device with the Pynwheel Tour app installed.</li></ul><div style='vertical-align:middle; text-align:center'><p style='font-weight: normal; font-size: 18px;'><b>Please download Pynwheel Tour app before you arrive:</b></div> #{community.email_text.gsub("\n", "<br>").html_safe rescue ""}"
    else
      email_content = is_rescheduled ? "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /></div><br/>Thank you for rescheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: <br/> <ul><li>A photo ID</li> <li>Your mobile device with the Pynwheel Tour app installed.</li></ul>Please download Pynwheel Tour app before you arrive: <br>iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Tour from the App Store</a><br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Tour from Google Play</a><br><br> #{community.email_text.gsub("\n", "<br>").html_safe rescue ""}" : "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /></div><br/>Thank you for scheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on  <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: <br/> <ul><li>A photo ID</li> <li>Your mobile device with the Pynwheel Tour app installed.</li></ul>Please download Pynwheel Tour app before you arrive: <br>iPhone Users: <a href=#{app_link} target='_blank'>Download Pynwheel Tour from the App Store</a><br>Android Users: <a href=#{android_link} target='_blank'>Download Pynwheel Tour from Google Play</a><br><br> #{community.email_text.gsub("\n", "<br>").html_safe rescue ""}"
    end
    community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincoln Property Company Pynwheel Tour" : "Pynwheel Tour"
    sms_content = !is_rescheduled ? 
    "Thank you for scheduling your tour! We look forward to having you at #{community.name if community.present?} on #{schedual_tour.tour_date.strftime("%A, %b %-d %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}.#{"\n"}When you go to the property, you will need: 
    - A photo ID
    - Your mobile device with the #{community_text} app installed 
    Download #{community_text} #{app_link} 
    
    #{community.email_text}" : 
    "Thank you for rescheduling your tour! We look forward to having you at #{community.name if community.present?} on #{schedual_tour.tour_date.strftime("%A, %b %-d %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")} instead of #{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")} at #{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}. When you go to the property, you will need: 
    - A photo ID 
    - Your mobile device with the #{community_text} app installed 
    Download #{community_text} #{app_link}
    
    #{community.email_text}"

    community_mail = is_rescheduled ? "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name.humanize}' /></div><br/>Someone has rescheduled a Pynwheel Tour at your property <b>#{community.name if community.present?}</b> from  <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b> to <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. <br>Name: #{tu.name}<br>Date: #{schedual_tour.tour_date.strftime("%m %d %Y")}<br>Time: #{Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}<br>Email: #{tu.email}<br>Phone: #{tu.phone_number}" : "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name.humanize}' /></div><br/>Someone has scheduled #{schedual_tour.scheduled_tour_type} at your property <b>#{community.name if community.present?}</b>. <br>Name: #{tu.name}<br>Date: #{schedual_tour.tour_date.strftime("%m %d %Y")}<br>Time: #{Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}<br>Email: #{tu.email}<br>Phone: #{tu.phone_number}"

    emails = community_email.gsub(" ","").split(',')
    subject1 = is_rescheduled ? "Tour has been rescheduled" : "Tour has been scheduled"
    subject2 = is_rescheduled ? "A Pynwheel Tour has been rescheduled!" : "A Pynwheel Tour has been scheduled!"

    DelayedSchedulerMailerJob.perform_async(subject1, email_content, tu.email,community,nil,nil,nil,emails[0],true,schedual_tour)if (community.alert_contact == "email" || community.alert_contact == "both")
    emails.each do |email|
      DelayedSchedulerMailerJob.perform_async(subject2,community_mail,email,community,nil,nil,nil,nil,false,schedual_tour)if (community.alert_contact == "email" || community.alert_contact == "both" || community.alert_contact == "phone")
    end
    
    sms_notifire(sms_content, schedual_tour&.tour_user&.phone_number, schedual_tour&.tour_user&.email, community&.id) if (community.alert_contact == "phone" || community.alert_contact == "both") rescue nil

    {email_content: email_content, sms_content: sms_content}
    
  end

  def sms_notifire msg, to, tour_user_email, community_id
    to = to.delete(' ')
    TwilioSmsWorker.perform_async(msg, to, tour_user_email, community_id)
  end

  def save_tour_user_card_info(tour_user_id,credit_card_number,exp_month,exp_year,card_verification)
    if @community.community_tour.credit_card_required
      if tour_user_id.present? && TourUser.find_by(id: tour_user_id).present?
        begin
          response = Stripe::Token.create({
                                            card: {
                                              number: credit_card_number.to_s,
                                              exp_month: exp_month.to_i,
                                              exp_year: exp_year.to_i,
                                              cvc: card_verification.to_s,
                                            },
                                          })
          
                                
          tu = TourUser.find(tour_user_id) 
          customer_id =  create_customer(tu.email, response[:id]).id
          tu.update(strip_customer_id: customer_id, card_last_digits: response[:card][:last4])

          render :json => { :success => true, :message => "Tour User Card Information Saved Successfully" }
        rescue Stripe::CardError => e
          render :json => { :success => false, :message => "#{e.error.message}" }
        end
      else
        render :json => { :success => false, :message => "Invalid Tour User Id" }
      end
    else
      render :json => { :status => false, :message => "Invalid Request" }
    end
  end

  private

  def logo_style
    "outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; clear: both; display: inline-block !important; border: none; height: auto; float: none; width: 200px; max-width: 200px;"
  end
end