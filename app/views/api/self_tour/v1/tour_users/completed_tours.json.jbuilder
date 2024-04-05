json.tours_data @tours do |tour|
  community = Community.find tour.community_id
  if tour.present? && community.present?
    json.community do 
      json.name community.name
      json.logo community.logo
      json.address community.address
      json.city community.city
      json.state community.state
      json.zip community.zip
      json.email community.email
      json.phone community.phone
      json.latitude community.latitude
      json.longitude community.longitude
    end

    json.tour do
      json.tour_site tour.tour_site
      json.tour_status tour.tour_status
      json.tour_type tour.tour_type
      json.tour_state tour.tour_state
      json.tour_time tour&.left&.strftime("%d %B %Y - %I:%M %p") 
    end
  end
end