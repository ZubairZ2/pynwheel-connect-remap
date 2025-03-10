json.success true
json.message "success"

json.floorplan do
  json.id @floorplan.id
  json.floorplan_name @floorplan.name
  json.bedrooms @floorplan.bedrooms.to_i.to_s rescue 0
  json.bathrooms @floorplan.bathrooms.to_i rescue 0
  json.square_feet @floorplan.square_feet
end

floorplates_obj = []

unless @community.is_sitemap
  @floorplates.uniq.each do |floorplate|
    floorplate.floors.each do |f|
      floorplates_obj << floorplate.get_floorplate_units_data(f, @floorplan.provider_floorplan_id, @community)
    end
  end

else
  floorplates_obj << @community.sitemap.get_sitemap_units_data(@units)
end

json.floorplates floorplates_obj.compact

json.units @units do |u|
  tour_stop = TourStop.where(stop_id: u.id, tour_id: @tour.id).last

  json.id u.id
  json.community_id u.community_id
  json.floorplate_id u.floorplate_id
  json.floorplan_id u.floorplan_id
  json.is_unit_already_available tour_stop.present? ? true : false
  json.unit_name u.api_unit_marketing_name
  json.unit_type u.unit_type
  json.x_plot u.x_plot
  json.y_plot u.y_plot
  json.floor u.floor.present? ? u.floor : ""
  json.building u.building.present? ? u.building : ""
  json.unique_unit_identifier  @community.is_sitemap ? "#{@community&.sitemap&.id}" : "#{u&.floorplate&.id}-#{u.floor}"

  begin
    json.available_date u.available_date < Date.today + 1 ? "Now" : u.available_date.strftime("%m-%d-%y")
    json.available_date_for_filter u.available_date.to_datetime
  rescue => ex
    json.available_date "N/A"
    json.available_date_for_filter "N/A"
  end
   
  json.available u.available
  json.availability u.availability
  json.effective_rent "#{@community.get_currency_symbol}#{u.effective_rent.to_i}"
  json.additional_fee @community.get_additional_fees(u)
  json.lease_pricing u.get_unit_leasing_price()
  json.display_rent @community.display_rent
  json.display_pricing_options @community.display_pricing_options
  json.description u.description
end
