json.success true
json.message "success"
json.data @units do |u|
        json.id u.id
        if @community.credential.present? and @community.credential.apply_now == "separate_link"
            json.availability_url @community.credential.separate_link
        elsif u.provider == "resman"
                begin
                      # j = u.availability_url.split('/')

                      #   url = j[0]+"//"+j[2]+"/Portal/Access/ApplicantRegistration?accountID="+u.community.credential.resman_account_id+"&propertyID="+u.community.credential.resman_property_id+"&redirectUrl=https://"+ j[2]+"/"+j[3]+"/"+j[4]+"/Continue?accountID="+u.community.credential.resman_account_id+"&unit="+u.provider_unit_id+"&propertyID="+u.community.credential.resman_property_id + "&"
                        json.availability_url u.availability_url
                rescue Exception => e
                        json.availability_url ""
                end
        elsif u.provider == "psi"
            json.availability_url u.availability_url_deep_linking.present? ? u.availability_url_deep_linking : u.availability_url
        else
                json.availability_url u.availability_url.present? ? u.availability_url : ""
        end
        if @community.credential.present? and @community.credential.apply_now.to_s == "separate_link"
            json.availability_url @community.credential.separate_link
        end
        json.community_id u.community_id
        json.provider u.provider
        json.property_id u.property_id
        json.provider_unit_id u.provider_unit_id
        json.unit_type u.unit_type
        json.marketing_name u.building.present? ? u.building + '-'+ u.marketing_name : u.marketing_name rescue u.marketing_name
        json.floorplan_id u.floorplan_id
        json.market_rent u.market_rent
        json.effective_rent u.effective_rent
        json.rent u.effective_rent
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
        json.sitemap_image_url @sitemap_image_url
        json.manually_updated u.manually_updated
        json.manual_override u.manual_override
        json.square_feet u.square_feet
        json.description u.description
        json.bedrooms u.floorplan.bedrooms.to_i.to_s rescue 0
        json.bathrooms u.floorplan.bathrooms rescue 0
        json.image (u.image.present? ? u.image.url : u.floorplan.image.url) rescue ""
        json.update_apply ((u.provider == "resman" || u.provider == "psi") && (@community.credential.present? and @community.credential.apply_now != "separate_link")) ? true : false
        json.display_rent @community.display_rent
        json.display_pricing_options @community.display_pricing_options
        
        lease_pricing = []
        begin
            if u.lease_pricing.present? && @community.display_pricing_options
              str_split = u.lease_pricing.split(';')
              str_split.each do |ss|
                str = ss.split(':')
                pricing_str = []
                pricing_str[0] = str[0]+" Month"
                pricing_str[1] = "$"+str[1].to_i.to_s
                # h = {"pricing_option" => pricing_str}
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
        json.lease_pricing_pynwheel_touch lease_pricing
end
