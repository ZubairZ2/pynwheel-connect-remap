json.tour_id @tour.id
json.community_id @community.id
json.community_name @community.name
json.community_company @community.company.name
json.community_phone @community.phone
json.community_address @community.address
json.community_logo @community.logo
json.community_latitude @community.latitude
json.community_longitude @community.longitude
json.currency_symbol @community.get_currency_symbol
json.chat_enabled @community.chat_control && @community.is_chat_available ? true : false
json.schedule_enabled @community.scheduler_widget
json.community_schedule_tour @community.schedule_tour_url
json.is_sitemap @community.is_sitemap
json.display_rent @community.display_rent
json.display_pricing_options @community.display_pricing_options
json.show_add_amenities_button @community.amenities_left_for_tour?(@tour.id)
json.show_add_units_button @community.units_left_for_tour?(@tour.id)
json.tour_stops CommunityTour.new(@community, @tour_user, @building_list, @floor_list_loop, @floor_list_temp, @tour).get_tour_stops