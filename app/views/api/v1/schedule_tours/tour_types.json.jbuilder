json.is_success true
json.error_code 200
json.message "Tour Types found successfully"
json.tour_types @tour_types do |tour_type|
    json.(tour_type, :title)
end
