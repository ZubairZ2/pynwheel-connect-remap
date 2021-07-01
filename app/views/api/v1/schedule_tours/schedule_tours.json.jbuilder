json.is_success true
json.status_code 200
json.message "Tour scheduled successfully"
json.data do
  json.property_id @community.id if @community.present? 
  json.property_name @community.name if @community.present?
  json.tour_user do
    json.(@tu, :first_name, :last_name, :email, :phone_number)
  end
  json.scheduled_tour do
    json.(@schedule_tour, :id, :tour_type, :tour_date, :tour_time, :tour_user_id, :desired_bedroom, :created_at, :updated_at)
  end
end