json.token @token.present? ? @token : ""
json.allow_usage @allow_usage
json.redirect_url @redirect_url
json.communities @communities do |community|
  if !(community.locked == true) && community.company.inactivate == false
    json.id community.id
    # json.name community.name
    json.name community.name + (community.city.present? ? " - " + community.city : " - ")  + (community.state.present? ? + ", "  + community.state  : "")
    json.company_name community.company.name
    json.latitude community.latitude
    json.longitude community.longitude
    json.address community.address
    json.logo community.logo.url

  end
end