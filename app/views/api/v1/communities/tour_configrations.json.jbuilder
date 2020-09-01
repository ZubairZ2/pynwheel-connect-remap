json.visual_id_verification @scheduled_tour.present? ? (@community.present? ? @community.tour.visual_id_verification : true) : false
json.virtual_tour @scheduled_tour.present? ? false : true # last name 'ontime' issue in user_saved_tour is corrected here
json.visited_history @visited_history

json.only_scheduled_tour false
json.grace_period 5
json.is_tour_unscheduled false
json.unscheduled_message "Please contact Resman to schedule a tour. +123456789"
json.early_arrive_message "Your tour is scheduled for 28-10-2020, 6:30 pm. You will not be able start your tour <x> minutes before that time. In the meantime, would you like to take a virtual tour?"
json.late_arrive_message "I'm sorry! You have missed your scheduled appointment. Your tour was scheduled for 28-10-2020, 6:30 pm."
json.scheduler_widget_allowed true
json.scheduler_widget_url "https://pynwheel-staging.herokuapp.com/communities/457/tours"
