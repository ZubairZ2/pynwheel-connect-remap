json.is_success true
json.status_code 200
json.message "Available tour dates found successfully"
json.data do
  json.available_tour_dates @available_dates.select { |d| Date.parse(d) >= Date.today}.uniq
end
# do |tour_date|
    # json.tour_date tour_date
    # # binding.pry
# end