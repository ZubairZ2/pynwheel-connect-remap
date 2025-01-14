- if @community.present? and @tour_user.present?
  json.data do
    community_code    =  (JWT.encode ({"community_id" => @community.id}), ENV['SECRET_KEY_BASE_v2'], 'HS256')  if @community.scheduler_widget
    if @is_salesforce_crm
      @community.community_tour.only_scheduled_tour = true
      @community.scheduler_widget         = false
    end

    json.visual_id_verification    check_visual_id_verification(@tour_user, @community)
    json.tour_type                 @tour_user.tour_type
    json.verification_type         @verfication_type
    json.with_in_radius            @within_one_km
    json.scheduler_widget_allowed  @community.scheduler_widget
    json.scheduler_widget_url      ""
    json.tour_alert                "Every thing is fine. Enjoy your tour"
    json.locks_thread_ref          @locks_thread
    json.get_user_card_info        check_tour_user_card_info(@community,@tour_user)
    json.tour_session_type         @tour_session_type
    json.is_tour_completed         @is_tour_completed

    if @in_visiting_hours
      if @community.community_tour.only_scheduled_tour                                              # aslo works with salesforce communities
          if @scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?
            unless @within_one_km
              json.scheduler_widget_allowed false
              if @location_received
                json.tour_alert "It looks like you're not at the property."
              else
                json.tour_alert "Unable to detect location. Please select one of the options below. "
              end
            end
          elsif @scheduled_data.tours_exist and !@scheduled_data.on_time_tour.present?
            if @scheduled_data.time_status == "before time"
              json.scheduler_widget_allowed false
              early_arrive_base_alert = @community.arrive_too_early_alert
              if early_arrive_base_alert.present?
                begin
                  arrive_too_early_alert = early_arrive_base_alert.gsub!("<date>", @tour_date).gsub!("<time>", @tour_time).gsub!("<grace time>", @community.community_tour.grace_period.to_s)
                rescue => error
                  arrive_too_early_alert = "Your tour is scheduled for #{@tour_date}, #{@tour_time}. You will be able start your tour #{@community.community_tour.grace_period.to_s} minutes before that time."
                end
              else
                arrive_too_early_alert = "Your tour is scheduled for #{@tour_date}, #{@tour_time}. You will be able start your tour #{@community.community_tour.grace_period.to_s} minutes before that time."
              end

              json.tour_alert arrive_too_early_alert
            elsif @scheduled_data.time_status == "after time"
              late_arrive_base_alert = @community.arrive_too_late_alert

              if late_arrive_base_alert.present?
                begin
                  arrive_too_late_alert = arrive_too_late_alert.gsub!("<date>", @tour_date).gsub!("<time>", @tour_time)
                rescue => error
                  arrive_too_late_alert = "I'm sorry! You have missed your scheduled appointment. Your tour was scheduled for #{@tour_date}, #{@tour_time}."
                end

                if @community.scheduler_widget
                  json.tour_alert arrive_too_late_alert + " Please click on the Reschedule button to reschedule."
                  json.scheduler_widget_url "#{root_url}scheduler/change_schedule_tour_time/#{@scheduled_data.nearest_tour.id}?datetime=#{@scheduled_data.nearest_tour.tour_date.strftime('%Y-%m-%d')}T#{@scheduled_data.nearest_tour.tour_time.strftime("%H:%M")}&community_code=#{community_code}&direct=true"
                else
                  json.tour_alert arrive_too_late_alert
                end
              else
                message = "Your tour is scheduled for #{@tour_date}, #{@tour_time}. You will be able start your tour #{@community.community_tour.grace_period.to_s} minutes before that time."
                if @community.scheduler_widget
                  json.tour_alert message + " Please click on the Reschedule button to reschedule."
                  json.scheduler_widget_url "#{root_url}scheduler/change_schedule_tour_time/#{@scheduled_data.nearest_tour.id}?datetime=#{@scheduled_data.nearest_tour.tour_date.strftime('%Y-%m-%d')}T#{@scheduled_data.nearest_tour.tour_time.strftime("%H:%M")}&community_code=#{community_code}&direct=true"
                else
                  json.tour_alert message
                end
              end
            end

          else !@scheduled_data.tours_exist
            if @community.scheduler_widget
              if @community.unscheduled_alert_with_widget.present?
                json.tour_alert @community.unscheduled_alert_with_widget + " To schedule a tour, please use the button below."
              else
                json.tour_alert "I'm sorry! We only allow scheduled tours. To schedule a tour, please use the button below."
              end
              json.scheduler_widget_url "#{root_url}scheduler_widget/test_widget?community_id=#{@community.id}&community_code=#{community_code}&direct=true"
            else
              phone = ""
              if @community.phone.present?
                phone =  @community.phone.scan(/\d/).join('')
                phone = "#{phone[-10..-8]}-#{phone[-7..-5]}-#{phone[-4..-1]}"
                contact_property = "To schedule a tour, please contact #{@community.name.split(' ').map(&:capitalize).join(' ')}: #{phone}. "
              end

              if @community.unscheduled_alert.present?
                begin
                  unscheduled_alert = @community.unscheduled_alert.gsub!("<phone>", phone)
                rescue => error
                  unscheduled_alert = "I'm sorry! We only allow scheduled tours. #{contact_property}"
                end
                
                json.tour_alert unscheduled_alert
              else
                json.tour_alert "I'm sorry! We only allow scheduled tours. #{contact_property}"
              end
            end
          end

      else
        unless @within_one_km
          json.scheduler_widget_allowed false
          if @location_received
            json.tour_alert "It looks like you're not at the property."
          else
            json.tour_alert "Unable to detect location. Please select one of the options below."
          end
        end
      end
    else
      json.scheduler_widget_allowed false
      json.tour_alert "It’s outside of the visiting hours. Please come back during visiting hours."
    end
  end

  json.message "Response of tour configrations"
  json.status "true"
else
  json.message "Commuity or tour user not found"
  json.status "false"
end