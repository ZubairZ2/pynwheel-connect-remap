json.communities @communities do |community|
	if !(community.locked == true) && community.company.inactivate == false
	  json.id community.id
	  json.name community.name
	  json.company_name community.company.name
    json.logo community.logo
	end
end