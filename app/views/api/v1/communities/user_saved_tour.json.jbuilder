description_limit = ENV["DESCRIPTION_LIMIT"].to_i
styling_start = '<div style="font-family: gotham-light; color: white !important;"><p>'
styling_end = '</p></div>'
json.name @tour_user.name
json.phone_number @tour_user.phone_number
json.email @tour_user.email
json.visual_id_verification @in_visiting_hours == true ? (@community.present? ? @community.community_tour.visual_id_verification : true) : false
json.virtual_tour @in_visiting_hours == true ? true : false   # seding reverse value due to last name of json field i.e 'ontime'
json.latest_message_id @latest_message_id 
json.chat_control (@community.chat_control and @community.is_chat_available) ? @community.chat_control : false
tours = [@tour]
tour_key = @last_vs.tour_key rescue nil
json.tours tours do |tour|
  json.id tour.id
  json.tour_key tour_key
  json.community_id @community.id
  json.name @community.community_tour.name
  json.latitude @community.community_tour.latitude
  json.longitude @community.community_tour.longitude
  json.x_plot @community.community_tour.x_plot
  json.y_plot @community.community_tour.y_plot
  json.image @community.community_tour.image.present? ? @community.community_tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url) rescue ""
  json.display_rent @community.display_rent
  json.display_pricing_options @community.display_pricing_options     
  json.show_apply_now @community.show_apply_now   

  json.visited_tour @visited_stops do |visited_stop|
    @tour = TourStop.find visited_stop rescue next
    stop = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id, tour_key: tour_key,tour_stop_id: visited_stop,description: nil, image: nil).last
    stop = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id, tour_key: tour_key,tour_stop_id: visited_stop).last unless stop.present?
    stop = VisitedStop.where(tour_user_id: @tour_user.id, tour_stop_id: @tour.id).last unless stop.present?
    
    if @tour.stop_type == "unit" || @tour.stop_type == "amenity"
      json.id @tour.id
      json.type @tour.stop_type
      if @tour.stop_type == "unit"
        unit = Unit.find @tour.stop_id
        json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit&.floorplan&.image.present? ? unit&.floorplan&.image.url : "") ): ""
        json.name unit.marketing_name
        json.unit_id unit.id
        json.x_plot unit.x_plot
        json.y_plot unit.y_plot
        json.modal_unit unit.modal_unit
        json.additional_fee @community.get_additional_fees(unit)
        json.floorplan_image @community.unit_floorplan_images(unit)
        json.event_time (stop.event_date.present? ? stop.event_date.strftime("%m/%d/%Y") + " " : "") + (stop.event_time.present? ? stop.event_time.strftime("%H:%M:%S") : "")  rescue ""
        json.video_link_button_label  unit.virtual_tour_button_label.present? ? unit.virtual_tour_button_label : unit&.floorplan&.virtual_tour_button_label
        json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ( unit&.floorplan&.present? && unit&.floorplan&.virtual_tour_url.present? ) ? unit&.floorplan&.virtual_tour_url : ""        

        lease_pricing = []
        if unit.lease_pricing.present? && @community.display_pricing_options
          str_split = unit.lease_pricing.split(';')
          str_split.each do |ss|
            str = ss.split(':')
            if str[1].to_i > 0
              pricing_str = str[0]+" Month - #{@community.get_currency_symbol}"+str[1].to_i.to_s
              lease_pricing << pricing_str
            end

          end
          lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
          lease_pricing2 = []
          lease_pricing.each do |lp|
            lease_pricing2 << {"pricing_option" => lp}
          end
          lease_pricing = lease_pricing2
        else
          h = {"pricing_option" => @community.get_currency_symbol + unit.effective_rent.to_i.to_s}
          lease_pricing << h
        end

        additional_details = unit.description.present? ? unit.description :  unit&.floorplan.description        
        unit_stop_description = unit.stop_description_formatting(additional_details) #ActionView::Base.full_sanitizer.sanitize(additional_details.present? ? additional_details : "")
        show_long_description = (unit_stop_description.size <= description_limit) ? false : true
  
        short_unit_stop_description = show_long_description ? unit_stop_description[0..description_limit - 1] : unit_stop_description
        long_unit_stop_description = styling_start + additional_details.gsub('red','') + styling_end rescue ""

        json.show_long_stop_description show_long_description
        json.floorplate_image @community.unit_floorplate_image_url(@community, tour, unit)
        # json.html_description unit.description
        json.stop_description short_unit_stop_description
        json.long_stop_description long_unit_stop_description
        
        json.availability_url unit.get_availability_url()
        json.update_apply ((unit.provider == "resman" || unit.provider == "psi") && (@community.credential.present? and @community.credential.apply_now != "separate_link")) ? true : false
        json.provider unit.provider

        stop_dat = {
          "floorplan" => unit.floorplan_id, 
          "floorplan_id" => unit&.floorplan&.id, 
          "floorplan_full_name" => unit&.floorplan&.name,
          "effective_rent" => "#{@community.get_currency_symbol}#{unit.effective_rent.to_i.to_s}",
          "available_date" => unit.available_date,
          "display_rent" => @community.display_rent, 
          "display_pricing_options" => @community.display_pricing_options, 
          "lease_pricing" => lease_pricing,
          "availability" => unit.availability,
          "stop_description" => unit.stop_description
        }
        
        json.stop_data stop_dat
        @unit_gallery_arr = []
        @unit_amenities = unit.amenities

        json.unit_amenities @unit_amenities.order(:sort) do |unit_amenity|
          if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"
          
          unit_amenity_description = unit_amenity.stop_description_formatting(unit_amenity.description) #ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")
          
          if unit_amenity_description.size > description_limit
            show_long_stop_description = true
          else
            show_long_stop_description = false
          end
          
          json.show_long_stop_description show_long_stop_description
          json.stop_description (show_long_stop_description ? unit_amenity_description[0..description_limit - 1] : unit_amenity_description)
          json.long_stop_description  styling_start + unit_amenity.description.gsub('red','') + styling_end rescue ""

          json.directional_text unit_amenity.directional_text
          json.video_link_button_label unit.virtual_tour_button_label.present? ? unit.virtual_tour_button_label : unit&.floorplan&.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ( unit&.floorplan&.present? && unit&.floorplan&.virtual_tour_url.present? ) ? unit&.floorplan&.virtual_tour_url : ""

            @unit_gallery_arr << unit_amenity

            unit_amenity&.amenity_galleries&.order(:sort)&.each do |ag|
              @unit_gallery_arr << ag
            end
          end
        end
        
        json.gallery @unit_gallery_arr do |ag|

          json.name ag.name
          json.image ag.image.url
          ag_description = ag.stop_description_formatting(ag.description) #ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")
          
          if ag_description.size > description_limit
            show_long_description = true
          else
            show_long_description = false
          end
          
          json.show_long_description show_long_description
          json.description (show_long_description ? ag_description[0..description_limit - 1] : ag_description)
          json.long_stop_description  styling_start + ag.description.gsub('red','') + styling_end rescue ""
          
          json.directional_text ag.directional_text
        end
      elsif @tour.stop_type == "amenity"
        amenity = Amenity.find @tour.stop_id
        json.image amenity.image.present? ? amenity.image.url : ""

        amenity_description = amenity.stop_description_formatting(amenity.description) #ActionView::Base.full_sanitizer.sanitize(amenity.description.present? ? amenity.description : "")
          
        if amenity_description.size > description_limit
          show_long_stop_description = true
        else
          show_long_stop_description = false
        end
        
        json.show_long_stop_description show_long_stop_description
        json.stop_description (show_long_stop_description ? amenity_description[0..description_limit - 1] : amenity_description)
        json.long_stop_description  styling_start + amenity.description.gsub('red','') + styling_end rescue ""
        floorplate_image = (amenity.amenityable.image.url.present? ? amenity.amenityable : nil) if amenity.amenityable.present? rescue nil

        json.floorplate_image floorplate_image.image.url rescue ""
        json.floorplan_image []
        json.name amenity.name
        json.x_plot amenity.x_plot
        json.y_plot amenity.y_plot
        json.event_time (stop.event_date.present? ? stop.event_date.strftime("%m/%d/%Y") + " " : "") + (stop.event_time.present? ? stop.event_time.strftime("%H:%M:%S") : "") rescue ""
        json.directional_text amenity.directional_text
        json.video_link_button_label amenity.video_link_button_label
        json.video_link amenity.video_link.present? ? amenity.video_link : ""

        amenityGalleryArr = []
        amenityGalleryArr << amenity
        amenity&.amenity_galleries&.order(:sort)&.each do |amen|
          amenityGalleryArr << amen
        end

        json.gallery amenityGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url

          ag_description = ag.stop_description_formatting(ag.description) #ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")
          
          if ag_description.size > description_limit
            show_long_description = true
          else
            show_long_description = false
          end
          
          json.show_long_description show_long_description
          json.description (show_long_description ? ag_description[0..description_limit - 1] : ag_description)
          json.long_stop_description  styling_start + ag.description.gsub('red','') + styling_end rescue ""

          json.directional_text ag.directional_text
        end
      end

      user_gallery = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id, tour_stop_id: @tour.id).where.not(image: nil)
      gallery_arr = []
      gallery_arr_v1 = []
      
      user_gallery.each do |ud|
        obj = {}
        obj[:id] = ud.id
        obj[:image] = ud.image
        obj[:event_time] = (ud.event_date.present? ? ud.event_date.strftime("%m/%d/%Y") + " " : "") + (ud.event_time.present? ? ud.event_time.strftime("%H:%M:%S") : "")  rescue ""
        gallery_arr << ud.image
        gallery_arr_v1 << obj
        # json.image ud.image.url
      end

      json.user_gallery gallery_arr
      json.user_gallery_v1 gallery_arr_v1
      user_notes = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: tour.id, tour_stop_id: @tour.id).where.not(description: nil)
      user_notes = user_notes.present? ? user_notes.order(:created_at).compact : []

      description_arr = []
      description_arr_v1 = []

      user_notes.each do |un|
        obj = {}
        obj[:id] = un.id
        obj[:note] = un.description
        obj[:event_time] = (un.event_date.present? ? un.event_date.strftime("%m/%d/%Y") + " " : "") + (un.event_time.present? ? un.event_time.strftime("%H:%M:%S") : "")
        description_arr << un.description
        description_arr_v1 << obj
      end

      json.notes description_arr
      json.notes_v1 description_arr_v1

    end
  end
end