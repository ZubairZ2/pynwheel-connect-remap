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
            json.late_arrive_with_reschduler ( @tour_status == "after time" and @community.scheduler_widget) ? (@community.arrive_too_late_alert.nil? ? "I'm sorry! You have missed your scheduled appointment. Your tour was scheduled for #{@tour_date}, #{@tour_time}. Please click on the Reschedule button to reschedule" : @community.arrive_too_late_alert + " Please click on the Reschedule button to reschedule. In the meantime, would you like to take a virtual tour?") : ""

        else
            json.tour_status "unscheduled"
            json.unscheduled_message "Please contact #{@community.name.split(' ').map(&:capitalize).join(' ')} to schedule a tour. #{@community.phone.present? ? @community.phone : ''}"
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