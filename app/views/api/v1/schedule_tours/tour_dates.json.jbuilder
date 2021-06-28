json.is_success true
json.error_code 200
json.message "Available tour dates found successfully"
json.available_tour_dates @tour_dates do |tour_date|
    json.tour_date tour_date.strftime('%d-%-m-%Y')
end