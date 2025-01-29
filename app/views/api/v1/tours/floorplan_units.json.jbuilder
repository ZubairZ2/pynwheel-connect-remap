json.success true
json.message "success"
json.data @units do |u|
  json.id u.id
  json.availability_url u.get_availability_url()
  json.show_apply_now @community.show_apply_now
  json.community_id u.community_id
  json.provider u.provider
  json.property_id u.property_id
  json.provider_unit_id u.provider_unit_id
  json.unit_type u.unit_type
  json.marketing_name u.api_unit_marketing_name
  json.floorplan_id u&.floorplan&.id
  json.floorplan_name u&.floorplan&.name
  json.market_rent u.market_rent&.to_i
  json.effective_rent u.effective_rent&.to_i
  json.rent u.effective_rent&.to_i
  json.availability u.availability
  json.available_date u&.available_date < Date.today + 1 ? "Now" : u&.available_date&.strftime("%-d %b") rescue "N/A"
  json.building u.building
  json.created_at u.created_at
  json.updated_at u.updated_at
  json.x_plot u.x_plot
  json.y_plot u.y_plot
  json.floorplate_id u.floorplate_id
  json.floor u.floor
  json.standard_image_url u.standard_image_url
  json.updated_by_admin u.updated_by_admin
  json.available u.available
  json.sold u.sold
  json.sitemap_image_url @sitemap_image_url
  json.manually_updated u.manually_updated
  json.manual_override u.manual_override
  json.square_feet u.square_feet
  json.description u.description
  json.bedrooms u&.floorplan&.bedrooms&.to_i&.to_s rescue 0
  json.bathrooms u&.floorplan&.bathrooms rescue 0
  json.image (u.image.present? ? u.image.url : u&.floorplan&.image&.url) rescue ""
  json.update_apply ((u.provider == "resman" || u.provider == "psi") && (@community.credential.present? and @community.credential.apply_now != "separate_link")) ? true : false
  json.display_rent @community.display_rent
  json.display_pricing_options @community.display_pricing_options
  json.display_virtual_tour_button_label true #unit.display_virtual_tour_button_label.present? ? unit.display_virtual_tour_button_label : false
  json.virtual_tour_button_label u.virtual_tour_button_label.present? ? u.virtual_tour_button_label : "3D Tour"
  json.virtual_tour u.get_unit_virtual_tour_url()
  json.unit_status u.unit_status
  json.additional_fee @community.get_additional_fees(u)

  if @community.display_rent && u.lease_pricing.present? && @community.display_pricing_options
    json.lease_pricing u.lease_pricing.gsub('=>', ':')
    json.lease_pricing_pynwheel_touch u.get_lease_term_pricing_matrix()
  else
    json.lease_pricing nil
    json.lease_pricing_pynwheel_touch []
  end

end
