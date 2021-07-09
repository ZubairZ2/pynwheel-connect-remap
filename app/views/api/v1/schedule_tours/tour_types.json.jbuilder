json.is_success true
json.status_code 200
json.message "Tour types found successfully"
json.data do
    json.property_id @community.id if @community.present? 
    json.property_name @community.name if @community.present? 
    json.tour_types @tour_types
end

