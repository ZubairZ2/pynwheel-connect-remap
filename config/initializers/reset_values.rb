Rails.application.config.after_initialize do
    # begin
    #     all_tasks_list = [
    #         "import:communities_unit_data",
    #         "import_unit_data:communities_of_realpage",
    #         "delayed_email_notifications:one_day_before",
    #         "delayed_email_notifications:one_hour_before",
    #         "import_unit_data_for_psi:communities_of_psi",
    #         "automate:unit_stops",
    #         "delayed_email_notifications:abandoned_tour_email",
    #         "email_property_before_tour:send_email",
    #         "realpage_marketing_sources:sources_by_property",
    #     ]
    #     unless all_tasks_list.include?(ARGV[0])
    #         LoggedInUser.destroy_all
    #         Community.update_all(is_chat_availble: false)
    #     else
    #         puts "No need to change the loggedInUsers values"
    #     end
    # rescue
    #     puts "Oops! something went wrong"
    # end
end