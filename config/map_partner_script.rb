community_names = [] # All list of all partner-approved list here
communities = Community.where(name: community_names)

communities.each do |community|
  begin
    community.map_partners.create!(
      partner: "rent.com",
      api_key: ENV["PARTNER_RENT_API_KEY"]
    )
  rescue => e
    next
  end
end