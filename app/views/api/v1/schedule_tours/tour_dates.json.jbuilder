json.is_success true
json.status_code 200
json.message "Available tour dates found successfully"
json.data do
  json.property_id @community.id if @community.present? 
  json.property_name @community.name if @community.present?
  json.available_tour_dates @available_dates.select { |d| Date.parse(d) >= Date.today}.distinct
end