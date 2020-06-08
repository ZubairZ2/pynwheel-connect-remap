json.success true
json.message "success"
json.data @units do |u|
        json.id u.id
        json.availability_url u.availability_url.present? ? u.availability_url : ""
        json.community_id u.community_id
        json.provider u.provider
        json.property_id u.property_id
        json.provider_unit_id u.provider_unit_id
        json.unit_type u.unit_type
        json.marketing_name u.marketing_name
        json.floorplan_id u.floorplan_id
        json.market_rent u.market_rent
        json.effective_rent u.effective_rent
        json.availability u.availability
        begin
                json.available_date u.available_date < Date.today + 1 ? "Now" : u.available_date.strftime("%m").to_i.to_s + "/" + u.available_date.strftime("%d").to_i.to_s

        rescue => ex
                json.available_date "N/A"
        end
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
        json.manually_updated u.manually_updated
        json.manual_override u.manual_override
        json.square_feet u.square_feet
        json.description u.description
        json.update_apply u.provider == "resman" ? true : false
    
end