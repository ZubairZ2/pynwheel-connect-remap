json.status 200
json.message "List of galleries"

json.data @galleries do |gallery|
  json.id gallery&.id
  json.name gallery&.name
  json.community_id gallery&.community_id
  json.is_default gallery.is_default
end
