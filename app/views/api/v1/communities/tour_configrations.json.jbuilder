- if @community.present?
    json.data do
        json.visual_id_verification @in_visiting_hours ? (@tour.visual_id_verification ) : false
        json.virtual_tour @in_visiting_hours ? false : true         # last name 'ontime' issue in user_saved_tour.json is corrected here
        json.visited_history @visited_history

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
            if @community.unscheduled_alert.present?
                @community.unscheduled_alert.gsub!("<phone>", @community.phone.present? ? @community.phone : '')
            end

            json.tour_status "unscheduled"
            json.unscheduled_message @community.unscheduled_alert.nil? ? (@community.scheduler_widget ? "I'm sorry! We only allow scheduled tours. To schedule a tour, please use the button below. You can take a virtual tour any time." : "I'm sorry! We only allow scheduled tours. To schedule a tour, please contact #{@community.name.titleize}: #{@community.phone.present? ? @community.phone : ''}. You can take a virtual tour any time." ) : (@community.scheduler_widget ?  @community.unscheduled_alert + " To schedule a tour, please use the button below. You can take a virtual tour any time." : @community.unscheduled_alert + " You can take a virtual tour any time.")
            json.early_arrive_message ""
            json.late_arrive_message ""
            json.late_arrive_with_reschduler ""
        end

        json.scheduler_widget_allowed @community.scheduler_widget
        json.scheduler_widget_url @community.scheduler_widget ? "#{root_url}scheduler/change_schedule_tour_time/#{@scheduled_tours.last.id}?datetime=#{@scheduled_tours.last.tour_date.strftime('%Y-%m-%d')}T#{@scheduled_tours.last.tour_time.strftime("%H:%M")}" : ""
    end

    json.message "Response of tour configrations"
    json.status "true"
else
    json.message "Commuity or tour user not found"
    json.status "false"
end