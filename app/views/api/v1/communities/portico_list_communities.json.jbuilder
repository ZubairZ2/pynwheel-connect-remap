json.token @token.present? ? @token : ""
json.allow_usage @allow_usage
json.redirect_url @redirect_url
json.communities @communities do |community|
  if !(community.locked == true) && community.company.inactivate == false
    json.id community.id
    json.crm_provider community.community_crm_provider
    json.name (community.name.include?(CommunityConstants::DWELO_TAG) ? community.name.split(" ", 2)[1] : community.name) + (community.city.present? ? " - " + community.city : " - ")  + (community.state.present? ? + ", "  + community.state  : "")
    json.email community.email.present? ? community.email : "" 
    json.phone community.phone.present? ? community.phone : ""
    json.company_name (community.company.name.include?(CommunityConstants::DWELO_TAG) ? community.company.name.split(" ", 2)[1] : community.company.name)
    json.latitude community.latitude
    json.longitude community.longitude
    json.address community.address
    json.logo community.self_tour_logo.present? ? community.self_tour_logo.url : (community.logo.present? ? community.logo.url : "No Image")
  end
end