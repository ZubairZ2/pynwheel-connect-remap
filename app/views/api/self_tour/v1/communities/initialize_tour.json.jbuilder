json.tour_id @tour.id
json.tour_key @random_string
json.community_id @community.id
json.skip_tour_editing @tour.skip_tour_editing
json.allow_tours_customization @community.community_tour&.tour_setting&.enable_tour_customization
json.units_available @community.available_unit_for_self_tour.count > 0
json.amenities_available @community.amenities_available_for_tour?
json.property_access (@tour_type != "virtual_tour" && @community.community_tour&.tour_setting&.enable_restricted_property_access) ? @tour_user.restricted_property_access : false
json.property_access_code (@tour_type != "virtual_tour" && @community.community_tour&.tour_setting&.enable_restricted_property_access) ? @tour_user.property_access_code : ""
json.unit_bedrooms @community.unit_bedrooms_filters(@floorplans)