# frozen_string_literal: true

module SchedualTours
  # The booking notifications of the scheduler widget, moved verbatim from
  # SchedualToursController (October 2026) so the Connect bookings
  # (Bookings::Create / Bookings::Reschedule) send exactly what the widget
  # sends: the visitor's confirmation or reschedule email and SMS, the
  # property's "someone has scheduled" mail, and the stored web notification.
  # Nothing in the bodies changed; the only additions are
  # `notifications_root_url` (the controller's `root_url`, or HOST_URL in a
  # service) and `normalize_phone` (the widget's `make_phone` without params).
  module Notifications
    private

    def send_email_and_other_notifications(schedual_tour,previous_tour,is_rescheduled,property_tour_type)
      tu = schedual_tour.tour_user
      community = schedual_tour.community
      community_email = community.email.present? ? community.email : 'info@pynwheel.com'
      @community_opening_hours = community.opening_hours.order(:sort).all
      time_slot ||= []
      slot_str = ""
      sms_slot_str = ""

      @community_opening_hours.each do |slot|
        time_slot << {"#{slot.day[0..2]}": "#{Time.zone.parse(slot.opening_time).strftime("%I:%M%p")} - #{Time.zone.parse(slot.closing_time).strftime("%I:%M%p")}"}
      end

      merged_slots = time_slot.each_with_object({}) { |h, o| h.each { |k,v| (o[k] ||= []) << v } }

      merged_slots.each do |k,v|
        slot_str += "<b>#{k}:</b> #{v.join(' and ')}#{merged_slots.keys.last == k ? "" : ", "}"
        sms_slot_str += "#{k}: #{v.join(' and ')}#{merged_slots.keys.last == k ? "" : "\n"}"
      end

      company_name = community.company.name.downcase
      @app_link = AppLinks.one_link(company_name)

      previous_text = ""

        if community.community_tour.tour_setting.enable_header_footer
          if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
            previous_text = "instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>."
          end
          email_content = (property_tour_type == "scheduled_tour" && is_rescheduled) ? "<div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>Thank you <b>#{tu.name}</b> for rescheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> #{previous_text} When you go to the property, you will need: <br/></p> </div> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li> <li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Tour app installed.</li></ul> <div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><b>Please download Pynwheel Tour app before you arrive:</b></div>" : 
          if property_tour_type == "unscheduled_self_tour"
            "<div style='vertical-align:middle; text-align:center;'><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> Thank you, <b>#{tu.name}</b> We look forward to having you at <b>#{community.name if community.present?}!</b> Our visiting hours are:</p>
            <p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;padding-right: 8%;padding-left: 5%'>#{slot_str}</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>When you go to the property, you will need a <b>photo ID</b> and a <b>mobile device</b> with the Pynwheel Tour app.</p><div style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>"
          elsif property_tour_type == "remote_tour"
            "<div style='vertical-align:middle; text-align:center'><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; '> Thank you <b>#{tu.name}</b> for choosing to tour <b>#{community.name if community.present?}</b> remotely! You can visit at any time from the comfort of your own home using our mobile app.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>"
          else 
            "<div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> Thank you <b>#{tu.name}</b> for scheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on  <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: <br/></p></div> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Tour app installed.</li></ul><div style='vertical-align:middle; text-align:center'><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><br><b>Please download Pynwheel Tour app before you arrive:</b></div>"
          end
        else
          if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
            previous_text = "instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>."
          end
          email_content = (property_tour_type == "scheduled_tour" && is_rescheduled) ? "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>Thank you for rescheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> #{previous_text} When you go to the property, you will need: </p></div> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li> <li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Tour app installed.</li></ul><div style='font-size: 18px;text-align:center'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><br>Please download Pynwheel Tour app before you arrive: <br>iPhone Users: <a href=#{@app_link} target='_blank'>Download Pynwheel Tour from the App Store</a><br>Android Users: <a href=#{@app_link} target='_blank'>Download Pynwheel Tour from Google Play</a><br></div>" : 
          if property_tour_type == "unscheduled_self_tour"
            "<div style='vertical-align:middle; text-align:center;'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> We look forward to having you at <b>#{community.name if community.present?}!</b> Our visiting hours are:<br/>#{slot_str}<br/>When you go to the property, you will need a <b>photo ID</b> and a <b>mobile device</b> with the Pynwheel Tour app.</p></div><div style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>"
          elsif property_tour_type == "remote_tour"
            "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'> Thank you <b>#{tu.name}</b> for choosing to tour <b>#{community.name if community.present?}</b> remotely! You can visit at any time from the comfort of your own home using our mobile app.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; '><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>"
          else
            "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;'>Thank you <b>#{tu.name}</b> for scheduling your tour! We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. When you go to the property, you will need: </p></div> <br/> <ul><li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>A photo ID</li> <li style='font-size: 16px; text-align: left; line-height: 22px; margin-bottom: 10px;'>Your mobile device with the Pynwheel Tour app installed.</li></ul><div style='font-size: 18px;text-align:center'><br>#{community.email_text.gsub("\n", "<br>").html_safe rescue ""}<br><br>Please download Pynwheel Tour app before you arrive: <br>iPhone Users: <a href=#{@app_link} target='_blank'>Download Pynwheel Tour from the App Store</a><br>Android Users: <a href=#{@app_link} target='_blank'>Download Pynwheel Tour from Google Play</a><br></div><br/>"
          end
        end
      community_text = (Company.find community.company_id).name.downcase == "lincoln" ? "Lincoln Property Company Pynwheel Tour" : "Pynwheel Tour"
      
      if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
        previous_text = "instead of <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> <br/> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b>."
      end

      web_notification = (property_tour_type == "scheduled_tour" && is_rescheduled) ? "<div style='vertical-align:middle; text-align:center;'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'>Thank you, <b>#{tu.name}</b> Your reservation is rescheduled. We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b> #{previous_text} Please keep an eye out for texts and emails with further instructions.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>" : 
      
      if property_tour_type == "unscheduled_self_tour"
        "<div style='vertical-align:middle; text-align:center;'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'> Thank you, <b>#{tu.name}</b> We look forward to having you at <b>#{community.name if community.present?}!</b> Our visiting hours are:</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;font-family: arial, helvetica, sans-serif !important; padding-right: 8%;padding-left: 5%'>#{slot_str}</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;font-family: arial, helvetica, sans-serif !important;'>When you go to the property, you will need a <b>photo ID</b> and a <b>mobile device</b> with the Pynwheel Tour app.</p></div><div style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px;font-family: arial, helvetica, sans-serif !important;'><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>"
      elsif property_tour_type == "remote_tour"
        "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'> Thank you, <b>#{tu.name}</b> for choosing to tour <b>#{community.name if community.present?}</b> remotely! You can visit at any time from the comfort of your own home using our mobile app.</p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>"
      else
        "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name}' /><br/><p class='mt-10' style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'> Thank you, <b>#{tu.name}</b> Your reservation is confirmed. We look forward to having you at <b>#{community.name if community.present?}</b> on <b>#{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> <br/>at <b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. Please keep an eye out for texts and emails with further instructions. </p><p style='text-align: center; font-size: 16px; margin-bottom: 10px; line-height: 22px; font-family: arial, helvetica, sans-serif;'><b>Please download the Pynwheel Tour app before you arrive:</b></p></div>"
      end 

      confirmation_page_link = "#{notifications_root_url}scheduler_widget/confirmation_instructions?community_id=#{community.id}&schedual_tour=#{schedual_tour.id}&reschedule=#{is_rescheduled}"
      
      if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
        previous_text = "instead of #{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")} at #{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}.#{"\n"}"
      end

      (is_rescheduled && property_tour_type == "scheduled_tour") ? schedual_tour.update(reschedule_notification: web_notification) : schedual_tour.update(confirmation_notification: web_notification)
      sms_content = (is_rescheduled && property_tour_type == "scheduled_tour") ? 
      "Thank you for rescheduling your tour! We look forward to having you at #{community.name if community.present?} on #{schedual_tour.tour_date.strftime("%A, %b %-d %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")} #{previous_text}#{"\n"}#{"\n"}When you go to the property, you will need: 
      - A photo ID 
      - Your mobile device with the #{community_text} app installed#{"\n"}
#{community.email_text}#{"\n"}
#{"\n"}#{"\n"}Use this link to download #{community_text}: #{@app_link}#{"\n"}#{"\n"}
#{community.email_text}#{"\n"}
Get information about your tour here: #{confirmation_page_link}" :

      if property_tour_type == "unscheduled_self_tour"
        "We look forward to having you at #{community.name if community.present?} ! Our visiting hours are:
#{sms_slot_str}#{"\n"}#{"\n"}When you go to the property, you will need:
            - A photo ID
            - Your mobile device with the #{community_text} app installed#{"\n"}
#{community.email_text}#{"\n"}
#{"\n"}#{"\n"}Use this link to download #{community_text}: #{@app_link}#{"\n"}#{"\n"}
Get information about your tour here: #{confirmation_page_link}"
      elsif property_tour_type == "remote_tour"
        "Thank you for choosing to tour #{community.name if community.present?} remotely! You can visit at any time from the comfort of your own home using our mobile app.#{"\n"}
#{community.email_text}#{"\n"}
#{"\n"}#{"\n"}Use this link to download #{community_text}: #{@app_link}#{"\n"}#{"\n"}
Get information about your tour here: #{confirmation_page_link}"

      else
        "Thank you for scheduling your tour! We look forward to having you at #{community.name if community.present?} on #{schedual_tour.tour_date.strftime("%A, %b %-d %Y")} at #{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}.#{"\n"}#{"\n"}When you go to the property, you will need: 
        - A photo ID
        - Your mobile device with the #{community_text} app installed#{"\n"}
#{community.email_text}#{"\n"}
#{"\n"}#{"\n"}Use this link to download #{community_text}: #{@app_link}#{"\n"}#{"\n"}
Get information about your tour here: #{confirmation_page_link}"
      end

      if previous_tour[:tour_date].present? && previous_tour[:tour_time].present?
        previous_text = "from  <b>#{previous_tour[:tour_date].strftime("%A, %b %-d, %Y")}</b> at <b>#{ Time.parse(previous_tour[:tour_time].to_s).strftime("%-I:%M %P")}</b> to <b> "
      else
        previous_text = "</b> at <b>"
      end

      community_mail = is_rescheduled && property_tour_type == "scheduled_tour" && (schedual_tour.tour_type == "self_tour" ||  schedual_tour.tour_type == "guided_tour" ) ? "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name.humanize}' /></div><br/>
      Someone has rescheduled #{schedual_tour.scheduled_tour_type} at your property <b>#{community.name if community.present?}</b> #{previous_text} #{schedual_tour.tour_date.strftime("%A, %b %-d, %Y")}</b> at<b>#{ Time.parse(schedual_tour.tour_time.to_s).strftime("%-I:%M %P")}</b>. <br>Name: #{tu.name}<br>Date: #{schedual_tour.tour_date.strftime("%m %d %Y")}<br>Time: #{Time.parse(schedual_tour.tour_time.to_s).strftime("%I:%M %P")}<br>Email: #{tu.email}<br>Phone: #{tu.phone_number}" : 
      "<div style='vertical-align:middle; text-align:center'><img style='#{logo_style}' align='center' border='0' width='200' src='#{community.logo_for_email}' data-title='#{community.name.humanize}' /></div><br/>Someone has scheduled #{schedual_tour.scheduled_tour_type} at your property <b>#{community.name if community.present?}</b>. <br>Name: #{tu.name}<br>Date: #{schedual_tour.tour_date.present? ? schedual_tour.tour_date.strftime("%m %d %Y") : schedual_tour.created_at.strftime("%m %d %Y") }<br>Time: #{Time.parse(schedual_tour.tour_time.present? ? schedual_tour.tour_time.to_s : schedual_tour.created_at.to_s).strftime("%I:%M %P")}<br>Email: #{tu.email}<br>Phone: #{tu.phone_number}"

      emails = community_email.gsub(" ","").split(',')
      subject1 =  email_subject(is_rescheduled,property_tour_type,schedual_tour,false) 
      subject2 =  email_subject(is_rescheduled,property_tour_type,schedual_tour,true) 
      ScheduledTourMailerJob.perform_async(subject1, email_content, tu.email,community,nil,nil,nil,emails[0],true,schedual_tour)if (community.alert_contact == "email" || community.alert_contact == "both")
      
      unless tu.is_virtual_tour?
        emails.each do |email|
          ScheduledTourMailerJob.perform_async(subject2,community_mail,email,community,nil,nil,nil,INFO_EMAIL,false,schedual_tour)if (community.alert_contact == "email" || community.alert_contact == "both" || community.alert_contact == "phone")
        end
      end

      sms_notifire(sms_content, schedual_tour&.tour_user&.phone_number, tu&.email, community&.id) if (schedual_tour.tour_user.is_sms_enabled && (community.alert_contact == "phone" || community.alert_contact == "both")) rescue nil

      {email_content: email_content, web_notification: web_notification, sms_content: sms_content}
      
    end


    def email_subject(is_rescheduled,property_tour_type,schedual_tour,community_mail)
      if is_rescheduled && property_tour_type == "scheduled_tour" && schedual_tour.tour_type == "self_tour"
        community_mail ? "An App Guided Tour has been rescheduled!" : "App Guided Tour has been rescheduled"
      elsif property_tour_type == "unscheduled_self_tour"
        community_mail ? "Unscheduled App Guided Tour has been confirmed!" : "App Guided Tour has been confirmed"
      elsif property_tour_type == "remote_tour"
        community_mail ? "Virtual Tour has been confirmed!" : "Remote Tour has been confirmed"
      elsif !is_rescheduled && property_tour_type == "scheduled_tour" && schedual_tour.tour_type == "guided_tour"
        community_mail ? "A Person Guided Tour has been scheduled!" : "Person Guided Tour has been scheduled"
      elsif is_rescheduled && property_tour_type == "scheduled_tour" && schedual_tour.tour_type == "guided_tour"
        community_mail ? "A Person Guided Tour has been rescheduled!" : "Person Guided Tour has been rescheduled"
      else
        community_mail ? "An App Guided Tour has been scheduled!" : "App Guided Tour has been scheduled"
      end
    end

    def sms_notifire msg, to, tour_user_email, community_id
      to = to.delete(' ')
      TwilioSmsWorker.perform_async(msg, to, tour_user_email, community_id)
    end

    def make_phone
      normalize_phone(params[:tour_user][:phone_number], params[:country_code])
    end

    # The widget's phone rule: strip leading zeros and a leading "+", then
    # prefix the country's calling code unless the number already starts with
    # it. Anything unparseable is "" (the legacy outcome).
    def normalize_phone(phone_number, country_code)
      begin
        user_phone = phone_number.to_s.sub(/^[0]+/,'')
        user_phone = trim_leading('\+', user_phone) if user_phone.starts_with? '+'

        c = ISO3166::Country.new(country_code)
        if user_phone.starts_with? c.country_code
          user_phone = "+#{user_phone}"
        else
          user_phone = "+#{c.country_code}#{user_phone}"
        end
        user_phone
      rescue => ex
        ""
      end
    end

    def trim_leading chr, str
      str.gsub(/^#{chr}+/,'')
    end

    def logo_style
      "outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; clear: both; display: inline-block !important; border: none; height: auto; float: none; width: 200px; max-width: 200px;"
    end

    # `root_url` in a controller; the configured host in a service.
    def notifications_root_url
      return root_url if respond_to?(:root_url, true)

      "#{ENV['HOST_URL'].to_s.chomp('/')}/"
    end
  end
end
