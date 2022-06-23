json.tour_id @tour.id
json.community_id @community.id
json.community_name @community.name
json.community_company @community.company.name
json.community_phone @community.phone
json.community_address @community.address
json.community_logo @community.logo
json.community_schedule_tour @community.schedule_tour_url
json.is_sitemap @community.is_sitemap
json.tour_stops CommunityTour.new(@community, @tour_user, @building_list, @floor_list_loop, @floor_list_temp, @tour).get_tour_stops