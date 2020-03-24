json.communities @communities do |community|
	if !(community.locked == true) && community.company.inactivate == false
	  json.id community.id
	  json.name community.name
    json.name_address community.name + (community.state.present? ? " "+ community.state + " " : "") + + (community.city.present? ? ","+ community.city : "")
    json.company_name community.company.name
    json.latitude community.latitude
    json.longitude community.longitude
    json.address community.address
    json.logo community.logo.url

	end
end