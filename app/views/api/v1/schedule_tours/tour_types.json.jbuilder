json.is_success true
json.error_code 200
json.message "Tour Types found successfully"
json.data do
    json.property_id @community.id if @community.present? 
    json.property_name @community.name if @community.present? 
    json.tour_types @tour_types
end

