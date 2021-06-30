json.is_success true
json.status_code 200
json.message "Properties found successfully"
json.properties @communities do |community|
    json.(community, :id, :name, :address)
    json.credit_card_required community.tour.credit_card_required
end
