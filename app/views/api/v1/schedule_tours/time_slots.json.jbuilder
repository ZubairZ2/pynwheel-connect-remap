json.is_success true
json.status_code 200
json.message "Available time slots found successfully"
json.data do
  json.available_time_slots @available_time_slots
end