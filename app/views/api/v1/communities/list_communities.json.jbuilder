json.communities @communities do |community|
  json.id community.id
  json.name community.name
  json.company_name community.company.name
end