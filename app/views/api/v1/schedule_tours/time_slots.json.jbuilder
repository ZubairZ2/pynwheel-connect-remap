json.is_success true
json.status_code 200
json.message "Available time slots found successfully"
json.data do
  json.property_id @community.id if @community.present? 
  json.property_name @community.name if @community.present? 
  json.available_time_slots @available_time_slots
end