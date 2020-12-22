- if @community.present?
    json.data do
        json.visual_id_verification @in_visiting_hours ? (@tour.visual_id_verification ) : false
        json.verification_type @verfication_type
        json.virtual_tour @in_visiting_hours ? false : true         # last name 'ontime' issue in user_saved_tour.json is corrected here
        json.visited_history @visited_history
        json.locks_thread_ref @locks_thread
        json.tour_user @tour_user
        json.unscheduled_tours_allowed !@tour.only_scheduled_tour
        json.grace_period @tour.grace_period
        json.is_tour_scheduled @scheduled_tours.present?
        
        if @scheduled_tours.present?
            json.tour_status @is_tour_ontime.present? ? "on time" : @tour_status
            json.unscheduled_message ""

            if @community.arrive_too_early_alert.present?
                @community.arrive_too_early_alert.gsub!("<date>", @tour_date)
                @community.arrive_too_early_alert.gsub!("<time>", @tour_time)
                @community.arrive_too_early_alert.gsub!("<grace time>", @tour.grace_period.to_s)   
            end

            if @community.arrive_too_late_alert.present?
                @community.arrive_too_late_alert.gsub!("<date>", @tour_date)
                @community.arrive_too_late_alert.gsub!("<time>", @tour_time)
            end

            json.early_arrive_message @tour_status == "before time" ? (@community.arrive_too_early_alert.nil? ? "Your tour is scheduled for #{@tour_date}, #{@tour_time}. You will be able start your tour #{@tour.grace_period.to_s} minutes before that time. In the meantime, would you like to take a virtual tour?" : @community.arrive_too_early_alert + " In the meantime, would you like to take a virtual tour?") : ""
            json.late_arrive_message ( @tour_status == "after time" and !@community.scheduler_widget) ? (@community.arrive_too_late_alert.nil? ? "I'm sorry! You have missed your scheduled appointment. Your tour was scheduled for #{@tour_date}, #{@tour_time}." : @community.arrive_too_late_alert + " In the meantime, would you like to take a virtual tour?") : ""
            json.late_arrive_with_rescheduler ( @tour_status == "after time" and @community.scheduler_widget) ? (@community.arrive_too_late_alert.nil? ? "I'm sorry! You have missed your scheduled appointment. Your tour was scheduled for #{@tour_date}, #{@tour_time}. Please click on the Reschedule button to reschedule" : @community.arrive_too_late_alert + " Please click on the Reschedule button to reschedule. In the meantime, would you like to take a virtual tour?") : ""
            
        else
            phone = @community.phone.present? ? @community.phone.scan(/\d/).join('') : ''
            phone = "#{phone[-10..-8]}-#{phone[-7..-5]}-#{phone[-4..-1]}"
            if @community.unscheduled_alert.present?
                @community.unscheduled_alert.gsub!("<phone>", phone)
            end

            json.tour_status "unscheduled" 
            unless @community.scheduler_widget
                json.unscheduled_message @community.unscheduled_alert.nil? ? ("I'm sorry! We only allow scheduled tours. To schedule a tour, please contact #{@community.name.titleize}: #{phone}. In the meantime, would you like to take a virtual tour?" ) : (@community.unscheduled_alert + " In the meantime, would you like to take a virtual tour?")
            else
                json.unscheduled_message @community.unscheduled_alert_with_widget.nil? ? ("I'm sorry! We only allow scheduled tours. To schedule a tour, please use the button below. In the meantime, would you like to take a virtual tour?" ) : (@community.unscheduled_alert_with_widget + " To schedule a tour, please use the button below. In the meantime, would you like to take a virtual tour?")
            end
            json.early_arrive_message ""
            json.late_arrive_message ""
            json.late_arrive_with_reschduler "" 
        end

        json.scheduler_widget_allowed @community.scheduler_widget
        if @scheduled_tours.present?
            json.scheduler_widget_url (@community.scheduler_widget and @scheduled_tours.last.present?) ? "#{root_url}scheduler/change_schedule_tour_time/#{@scheduled_tours.last.id}?datetime=#{@scheduled_tours.last.tour_date.strftime('%Y-%m-%d')}T#{@scheduled_tours.last.tour_time.strftime("%H:%M")}" : ""
        else
            json.scheduler_widget_url @community.scheduler_widget ? "#{root_url}/scheduler_widget/test_widget?community_id=#{@community.id}" : ""
        end 
    end

    json.message "Response of tour configrations"
    json.status "true"
else
    json.message "Commuity or tour user not found"
    json.status "false"
end