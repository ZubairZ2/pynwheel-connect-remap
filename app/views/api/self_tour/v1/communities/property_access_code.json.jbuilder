json.tour_id @tour.id
json.tour_key @random_string
json.community_id @tour.community_id
json.allow_tours_customization @tour&.tour_setting&.enable_tour_customization
json.property_access @tour&.tour_setting&.enable_restricted_property_access ? @tour_user.restricted_property_access : false
json.property_access_code @tour&.tour_setting&.enable_restricted_property_access ? @tour_user.property_access_code : ""
json.unit_bedrooms @community.unit_bedrooms_filters(@floorplans)