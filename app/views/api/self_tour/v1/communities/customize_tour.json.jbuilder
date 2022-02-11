json.tour_id @tour.id
json.community_id @community.id
json.is_sitemap @community.is_sitemap
json.tour_stops CommunityTour.new(@community, @tour_user, @building_list, @floor_list_loop, @floor_list_temp).get_tour_stops