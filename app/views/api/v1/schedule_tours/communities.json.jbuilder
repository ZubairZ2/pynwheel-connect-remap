json.is_success true
json.error_code 200
json.message "Communities found successfully"
json.communities @communities do |community|
    json.(community, :id, :name, :address)
    json.credit_card_required community.tour.credit_card_required
    # json.property_code JsonWebToken.encode(sub: community.id)
    # binding.pry
end
