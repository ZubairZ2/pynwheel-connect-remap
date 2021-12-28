json.success true
json.message "success"
json.data @units do |u|
  json.id u.id
  
  json.community_id u.community_id
  json.provider u.provider
  json.property_id u.property_id
  json.provider_unit_id u.provider_unit_id
  json.unit_type u.unit_type
  json.floorplan_id u.floorplan_id
  json.floorplan_name u&.floorplan&.name
  json.bedrooms u.floorplan.bedrooms rescue 0
  json.bathrooms u.floorplan.bathrooms rescue 0
  json.square_feet u.square_feet
  json.x_plot u.x_plot
  json.y_plot u.y_plot
  json.unit_name u.name
  json.floor u.floor
  begin
    json.available_date u.available_date < Date.today + 1 ? "Now" : u.available_date.strftime("%m").to_i.to_s + "/" + u.available_date.strftime("%d").to_i.to_s
  rescue => ex
    json.available_date "N/A"
  end
  json.building u.building
  json.available u.available
  json.availability u.availability
  json.effective_rent u.effective_rent
  lease_pricing = []
  begin
    if u.lease_pricing.present?
      str_split = u.lease_pricing.split(';')
      str_split.each do |ss|
        str = ss.split(':')
        pricing_str = []
        pricing_str[0] = str[0]+" Month"
        pricing_str[1] = "$"+str[1].to_i.to_s
        lease_pricing << pricing_str

      end
      
      lease_pricing = lease_pricing.sort_by {|x| x[0][0..1].to_i}
      lease_pricing2 = []
      lease_pricing.each do |lp|
        lease_pricing2 << {"pricing_month" => lp[0],"pricing_rent" => lp[1]}
      end
      lease_pricing = lease_pricing2
    end
  rescue => ex
  end
  json.lease_pricing lease_pricing
  json.description u.description
end
