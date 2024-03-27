json.tour_id @tour.id
json.tour_key @random_string
json.community_id @community.id
json.allow_tours_customization @community.community_tour&.tour_setting&.enable_tour_customization
json.units_available @community.available_unit_for_self_tour.count > 0
json.amenities_available @community.available_amenities_for_self_tour
json.property_access (@tour_type != "virtual_tour" && @community.community_tour&.tour_setting&.enable_restricted_property_access) ? @tour_user.restricted_property_access : false
json.property_access_code (@tour_type != "virtual_tour" && @community.community_tour&.tour_setting&.enable_restricted_property_access) ? @tour_user.property_access_code : ""
json.unit_bedrooms @community.unit_bedrooms_filters(@floorplans)