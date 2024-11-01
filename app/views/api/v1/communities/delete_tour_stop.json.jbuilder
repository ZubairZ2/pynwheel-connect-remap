i = 0
description_limit = 90
styling_start = '<div style="font-family: gotham-light; color: white  !important;"><p>'
styling_end = '</p></div>'
json.tours @tours do |tour|

  json.id tour.id
  require 'securerandom'
  json.tour_key  random_string = SecureRandom.hex
  json.community_id tour.community_id
  json.name tour.name
  json.latitude tour.latitude
  json.longitude tour.longitude
  json.x_plot tour.x_plot
  json.y_plot tour.y_plot
  json.tour_setting do
    json.current_position_marker_icon tour.marker_icon_size.present? ? (tour.marker_icon_size == "0" ? "19x25" : (tour.marker_icon_size == "1" ? "17x23" : (tour.marker_icon_size == "2" ? "15x21" : (tour.marker_icon_size == "3" ? "13x19" : (tour.marker_icon_size == "4" ? "11x17" : "19x25")  )) ) )  : "19x25"
    json.next_position_marker_icon  tour.marker_icon_size.present? ? (tour.marker_icon_size == "0" ? "35x35" : (tour.marker_icon_size == "1" ? "33x33" : (tour.marker_icon_size == "2" ? "31x31" : (tour.marker_icon_size == "3" ? "29x29" : (tour.marker_icon_size == "4" ? "27x27" : "35x35")  )) ) )  : "35x35"
    json.show_camera_button @in_visiting_hours == true ? @community.show_camera_button : false
    json.dotted_line_color @community.community_tour.dotted_line_color rescue "green"
    json.visual_id_verification tour.visual_id_verification
    json.chat_control (@community.chat_control and @community.is_chat_available) ? @community.chat_control : false
    json.show_map @community.show_map
    json.show_apply_now @community.show_apply_now
    json.mdu @community.mdu

  end
  fs = @community.favorite_stop.present? ? @community.favorite_stop : FavoriteStop.new
  
  favorite_unit_array = (fs.present? ? fs.favorite_unit : []) + (fs.user_favorites_unit[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_unit[@tour_user.email] : [])
  favorite_amenity_array = (fs.user_favorites_amenity[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_amenity[@tour_user.email] : [])
  
  json.is_sitemap @community.is_sitemap
  if @community.is_sitemap
    json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)

  else
    @floorplate = @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    json.image @floorplate.image

  end
  if @community.show_map

    ts = @community.mdu ? tour.tour_stops.plotted_stops.where.not(id: @community.deleted_ids).order(:sort) : tour.tour_stops.plotted_stops.where.not(id: @community.deleted_ids, stop_type: "unit").order(:sort)
    ts1 = tour.tour_stops.plotted_stops.where(id: @community.deleted_ids).map{|x| x.id}

    if @community.is_sitemap
      sp = Path.where(map_path_from_id: ts&.last&.stop_id, map_path_to_id: nil)&.first
    else
      ts.where(stop_type: "elevator").each do |last_elev|
        sp = Path.where(map_path_from_id: last_elev.stop_id, map_path_to_id: nil)&.first unless sp.present? rescue nil
      end
    end

    if sp.blank?
      @community.is_sitemap ? sp = Path.where(map_path_from_id: nil, map_path_to_id: ts&.last&.stop_id)&.first : sp = Path.where(map_path_from_id: nil, map_path_to_id: ts.where(stop_type: "elevator").first.stop_id)&.first rescue nil
      json.path_points sp.present? ? sp.path_points.reorder('id DESC') : []
    else
      json.path_points sp.present? ? sp.path_points.reorder('id ASC') : []
    end
    stops_arr = []  
    if @community.is_sitemap

      stops_arr = @community.mdu ? @community.community_tour.tour_stops.plotted_stops.where(display_stop: true).order(:sort) : @community.community_tour.tour_stops.plotted_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
      if stops_arr.present? and @tour_user.desired_bedroom.present? and (tour.tour_setting.present? ? (tour.tour_setting.show_desired_bedroom.present? ? tour.tour_setting.show_desired_bedroom : false) : false)
        stops_arr1 = []
        stops_arr.each do |add_stop|
          if add_stop.stop_type == "unit"
            unit = Unit.find_by_id add_stop.stop_id

            if unit&.floorplan&.bedrooms.to_i == @tour_user.desired_bedroom.to_i
              stops_arr1 << add_stop
            end
          else
            stops_arr1 << add_stop
          end
          stops_arr = stops_arr1
        end
      end
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 3]
      last_stop_desc = stops_arr.compact[stop_count - 2]
    else
      temp_max_floor = nil
      min_floor = @community.floorplates.map{|f| f.floors}.flatten.min
      @building_list << "" if @building_list == []
      @building_list.each do |building|
        @floor_list.each do |floor|
          begin
            
            if @community.community_tour.sort_hash[building+','+ floor.to_s].present?
              arr_to_remove = @community.community_tour.sort_hash[building+','+ floor.to_s].grep(/\d+/, &:to_i) - @community.deleted_ids
              if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.distinct.count == 1 && (min_floor != floor) && (arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.distinct.include? "elevator")
                begin
                  # unless ((TourStop.find arr_to_remove).map{|x| (Elevator.find x.stop_id).floors.max - 1 if x.stop_type == "elevator"}).include? floor
                  next
                  # end
                rescue
                end
              end
              temp_max_floor = floor
              @community.community_tour.sort_hash[building+','+ floor.to_s].each do |s_id|
                # amenity_hit = true
                # ts_ck = (TourStop.find_by_id(s_id)) if (s_id.present? )
                # if ts_ck.present?  && ts_ck.stop_type == "amenity"
                #   amenity_hit = ([floor, nil].includes? (ts_ck.stop_type.classify.constantize.find (ts_ck.stop_id)).floor ) rescue true
                # end
                add_stop = TourStop.find_by_id(s_id)
                if add_stop.present?
                  add_mdu = @community.mdu ? true : !(add_stop.stop_type == "unit")
                  if add_stop.stop_type == "unit"
                    u = Unit.find add_stop.stop_id

                  end
                  bedroom_flag = true
                  #---------------- bedroom check
                  
                  if add_stop.stop_type == "unit" and @tour_user.desired_bedroom.present? and (tour.tour_setting.present? ? (tour.tour_setting.show_desired_bedroom.present? ? tour.tour_setting.show_desired_bedroom : false) : false)
                    unit = Unit.find_by_id add_stop.stop_id

                    unless unit&.floorplan&.bedrooms.to_i == @tour_user.desired_bedroom.to_i
                      bedroom_flag = false
                    end
                  end
                  #--------------------
                  stops_arr << add_stop if (add_stop.display_stop && add_mdu && bedroom_flag)
                end
                # stops_arr << (TourStop.find_by_id(s_id)) if (s_id.present? )
              end
            end
          rescue
          end
        end
      end
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 3]
      last_stop_desc = stops_arr.compact[stop_count - 2]
      blocked = []
      # begin
      # while (stops_arr.compact[stops_arr.compact.size - 1]).stop_type == "elevator"
      #   blocked << stops_arr.compact[stops_arr.compact.size - 1].stop_id
      #   stops_arr = stops_arr - [stops_arr[stops_arr.size - 1]]
      # end
      # rescue
      # end
      last_stop = stops_arr.compact[stops_arr.compact.size - 1]

      sto = last_stop.stop_type.classify.constantize.find_by_id(last_stop.stop_id)
      max_floor = sto.floors.max rescue (max_floor = temp_max_floor)
      @plates = []
      @ele_ = []
      Floorplate.where(community_id: @community.id).each{|x| @plates << x}
      @plates.each do |pl|
        floor_pl = Floorplate.find pl
        Elevator.where(floorplate_id: pl).map{|x| @ele_ << x}
      end
      while min_floor != max_floor do
        begin
          ele = @ele_.map{|x| x if x.floors.include?(max_floor)}.compact.first
          max_floor = ele.floors.min
          if stops_arr[stops_arr.size - 1].stop_id == ele.id
            max_floor = max_floor - 1
            next
          end
          stops_arr << TourStop.find_by(stop_id: ele.id) unless blocked.include?(ele.id)
        rescue
          break
        end
      end
    end
  


    stops = @community.mdu ? tour.tour_stops.plotted_stops : tour.tour_stops.plotted_stops.where.not(stop_type: "unit")
    all_stop_ids = stops_arr.compact.pluck(:id)
    stops_except_deleted_ids = all_stop_ids - @community.deleted_ids
    stops_except_deleted = []
    stops_except_deleted_ids.each do |id|
      stops_except_deleted << TourStop.find(id)
    end

    new_stops_arr = []
    last_element  = nil
    stops_except_deleted.each do |x|
      if last_element != x
        new_stops_arr << x
      end
      last_element = x
    end
  else
    stops_arr = []

    ########------------------------ Sorting tour Stop in an array-----------------------
    if @community.is_sitemap

      stops_arr = @community.mdu ? @community.community_tour.tour_stops.plotted_stops.where(display_stop: true).order(:sort) : @community.community_tour.tour_stops.plotted_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop_desc = stops_arr.compact[stop_count - 1]
    else
      temp_max_floor = nil
      min_floor = @community.floorplates.map{|f| f.floors}.flatten.min
      @building_list.each do |building|
        @floor_list.each do |floor|

          begin
            if @community.community_tour.sort_hash[building+','+ floor.to_s].present?
              arr_to_remove = @community.community_tour.sort_hash[building+','+ floor.to_s].grep(/\d+/, &:to_i) - @community.deleted_ids
              if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.distinct.count == 1 && (min_floor != floor) && (arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.distinct.include? "elevator")
                begin
                  # unless ((TourStop.find arr_to_remove).map{|x| (Elevator.find x.stop_id).floors.max - 1 if x.stop_type == "elevator"}).include? floor
                  next
                  # end
                rescue
                end
              end
              temp_max_floor = floor
              @community.community_tour.sort_hash[building+','+ floor.to_s].each do |s_id|
                # amenity_hit = true
                # ts_ck = (TourStop.find_by_id(s_id)) if (s_id.present? )
                # if ts_ck.present?  && ts_ck.stop_type == "amenity"
                #   amenity_hit = ([floor, nil].includes? (ts_ck.stop_type.classify.constantize.find (ts_ck.stop_id)).floor ) rescue true
                # end
                add_stop = TourStop.find_by_id(s_id)
                if add_stop.present?
                
                  add_mdu = @community.mdu ? true : !(add_stop.stop_type == "unit")
                  stops_arr << add_stop if (add_stop.display_stop && add_mdu)
                end
                # stops_arr << (TourStop.find_by_id(s_id)) if (s_id.present? )
              end
            end
          rescue
          end
        end
      end
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop_desc = stops_arr.compact[stop_count - 1]
      blocked = []
      last_stop = stops_arr.compact[stops_arr.compact.size - 1]
    end
    #########-------------------- End tour stop sort-----------------------
    new_stops_arr = stops_arr.compact
    json.path_points []
    # new_stops_arr = @community.mdu ? tour.tour_stops.plotted_stops : tour.tour_stops.plotted_stops.where.not(stop_type: "unit")
    # stop_count = new_stops_arr.count
    # second_last = new_stops_arr[stop_count - 2]
    # last_stop_desc = new_stops_arr[stop_count - 1]
  end
  

  hit = true
  counter = 0
  json.navigation_title "First Stop: " + new_stops_arr[0].name if new_stops_arr[0].present?
  json.tour_stop new_stops_arr.compact do |stop|
    # if counter == 0
    #   json.navigation_title "First Stop " + new_stops_arr[counter].name if new_stops_arr[counter].present?
    if @community.show_map
      begin
      if (stop.latitude + stop.longitude) < 1
        counter = counter + 1
        next
      end 
    rescue => err
      next unless stop.stop_type == "elevator"
    end
    else
      if stop.stop_type == "elevator"
        counter = counter + 1
        next
      end 
    end
    # next if !@community.mdu && stop.stop_type == "unit"
    navigation_title = ""
    if second_last.present? && second_last.id == stop.id
      navigation_title = @community.show_map ? ("Last Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      hit = false
    elsif last_stop_desc.present? && last_stop_desc.id == stop.id
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Last Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    elsif new_stops_arr[counter + 1].present?
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    end
    begin
      if (navigation_title.include? "elevator") || (navigation_title.include? "Elevator")
        navigation_title = "Next Stop: Elevator"
      end
    rescue => e
      navigation_title = ""
    end
    begin
      if @scheduled_tour.present?
        rml = RemoteLock.find_by(edge_state_id: @community.edge_state.id , stop_id: stop.stop_id) if @community.edge_state.present?
        if rml.present?
          if @tour_user.present? and @tour_user.as_guests.find_by(community_id: @community.id).present?
            igloo_guest = IglooGuest.find_by(stop_id: stop.stop_id, tour_user_id: @tour_user.id, status: "active")
            if igloo_guest.nil? 
              pin = @tour_user.as_guests.find_by(community_id: @community.id).edgestate_pin if @tour_user.as_guests.find_by(community_id: @community.id).present?
              json.guest_pin "Use code " + pin + "# to enter." if pin.present? and rml.remote_lock_type != "igloo_lock"
            else
              json.guest_pin "Use code " + igloo_guest.guest_code + " to enter." if igloo_guest.guest_code.present?
            end
          else
            json.guest_pin ''
          end
        else
          _stop_ = Unit.find_by_id stop.stop_id
          if _stop_.present? and _stop_.access_code.present?
            json.guest_pin "Use code " + _stop_.access_code + " to enter."
          else
            json.guest_pin ''
          end
        end
      else
        json.guest_pin ''
      end
    rescue => pin
      json.guest_pin ''
    end
    json.navigation_title navigation_title
    json.id stop.id
    json.x_plot stop.latitude
    json.y_plot stop.longitude
    json.unit_id stop.stop_id
    json.is_favorite favorite_unit_array.include?(stop.stop_id.to_s) ? true : false
    if params[:testing].present?
      if stop.stop_type == 'amenity' then json.type 'elevator' else json.type stop.stop_type end
    else
      json.type stop.stop_type
    end
    #//////////////////////////////////////////////////////////////-------------Unit portion---------------- ///////////////////////////////////////////////////////////////
    if stop.stop_type == "unit"

      unit = Unit.find_by_id stop.stop_id
      if unit.present?
      json.image unit.present? ? (unit.image.present? ? unit.image.url : (unit&.floorplan&.image.present? ? unit&.floorplan&.image.url : "no image") ): "no image"
      json.name unit.api_unit_marketing_name
      json.floorplate_image (unit.floorplate.image.present? ? unit.floorplate.image.url : nil) if unit.floorplate.present?
      unit_directional_text = ActionView::Base.full_sanitizer.sanitize(unit.stop_description.present? ? unit.stop_description : "")
      if unit_directional_text.size < description_limit
        show_directional_text = false
      else
        show_directional_text = true
      end

      json.directional_text show_directional_text ? unit_directional_text[0..description_limit - 1] : unit_directional_text
      json.show_directional_text show_directional_text
      json.long_directional_text styling_start + unit.stop_description + styling_end rescue ""
      json.video_link_button_label unit.virtual_tour_button_label
      json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ""
      lease_pricing = []
      if unit.lease_pricing.present? && !unit.modal_unit
        str_split = unit.lease_pricing.split(';')
        str_split.each do |ss|
          str = ss.split(':')

          if str[1].to_i > 0
            pricing_str = str[0]+" Month - #{@community.get_currency_symbol}"+str[1]
            # h = {"pricing_option" => pricing_str}
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
        h = {"pricing_option" => @community.get_currency_symbol + unit.effective_rent.to_s}
        lease_pricing << h
      end
      if unit.modal_unit
        lease_pricing = []
        @units = Unit.where('floorplan_id = ? AND community_id = ? AND available = ?', unit.floorplan_id,unit.community_id,true) if unit.present?
        @units.each do |floorplan_unit|
          unless floorplan_unit.id == unit.id
            pricing_str = {"pricing_option" => floorplan_unit.marketing_name + " #{@community.get_currency_symbol}" + floorplan_unit.effective_rent.to_s} rescue next
            lease_pricing << pricing_str
          end
        end
        lease_pricing = lease_pricing.sort_by!(&:zip)
      end
      unit_stop_description = ActionView::Base.full_sanitizer.sanitize(unit.stop_description.present? ? unit.stop_description : "")
      if unit_stop_description.size < description_limit
        show_long_description = false
      else
        show_long_description = true
      end

      stop_dat = {"floorplan" => Floorplan.find_by(id: unit&.floorplan&.id).name,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"lease_pricing" => lease_pricing,"availability" => unit.availability,"stop_description" => show_long_description ? unit_stop_description[0..description_limit - 1] : unit_stop_description,"show_long_description" => show_long_description,"long_stop_description" => (styling_start + unit.stop_description + styling_end  rescue ""), "availability_url"=> unit.availability_url.present? ? unit.availability_url :  Floorplan.find_by(provider_floorplan_id: unit.floorplan_id).availability_url}
      json.stop_data stop_dat
      @unit_amenities = unit.amenities #Amenity.where(community_id: @community.id, amenityable_type: "Unit", amenityable_id: stop.stop_id)
      unit_amenities_hit = true
      #////////////////////////////////////////// Unit Amenities NOTT Plotted ////////////////////////////////////////////
      json.unit_unploted_amenities @unit_amenities.order(:sort) do |unit_amenity|
        if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot == 0)
          unit_amenities_hit = false
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.name unit_amenity.name
          json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"
          json.stop_description unit_amenity.description
          json.directional_text unit_amenity.directional_text
          json.video_link_button_label unit.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ?  unit.virtual_tour_url : ""
          if unit_amenity.amenity_galleries.count == 0
            # temp_data = {"name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description}
            json.gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description, "directional_text" => unit_amenity.directional_text]
          else
            amenityGalleryArr = []
            # unit_amenity.description = nil
            amenityGalleryArr << unit_amenity
            unit_amenity.amenity_galleries.order(:sort).each do |amen|
              amenityGalleryArr << amen
            end
            json.gallery amenityGalleryArr do |ag|
              json.name ag.name
              json.image ag.image.url
              json.description ag.description
              json.directional_text ag.directional_text
            end
          end

        end
      end
      #///////////////////////////////////////// Unit amenities Plotted ///////////////////////////////////
      json.unit_amenities @unit_amenities.order(:sort) do |unit_amenity|
        if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
          unit_amenities_hit = false
          json.x_plot unit_amenity.x_plot
          json.y_plot unit_amenity.y_plot
          json.name unit_amenity.name
          json.image unit_amenity.image.present? ? unit_amenity.image.url : "no image"

          unit_amenity_stop_description = ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")
          if unit_amenity_stop_description.size < description_limit
            json.show_long_description false
          json.stop_description unit_amenity_stop_description
          else
            json.show_long_description true
          json.stop_description unit_amenity_stop_description[0..description_limit - 1]
          end

          json.long_stop_description styling_start + unit_amenity.description + styling_end  rescue ""

          unit_amenity_directional_text = ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")
          if unit_amenity_directional_text.size < description_limit
            json.show_long_directional_text false
          json.directional_text unit_amenity_directional_text
          else
            json.show_long_directional_text true
          json.directional_text unit_amenity_directional_text[0..description_limit - 1]
          end

          json.long_directional_text styling_start + unit_amenity.directional_text + styling_end  rescue ""
          json.video_link_button_label unit.virtual_tour_button_label
          json.video_link unit.virtual_tour_url.present? ?  unit.virtual_tour_url : ""
          if unit_amenity.amenity_galleries.count == 0
            stop_description = ActionView::Base.full_sanitizer.sanitize(unit_amenity.description.present? ? unit_amenity.description : "")
            if stop_description.size < description_limit
              show_long_description = false
            else
              show_long_description = true
            end
            directional_text = ActionView::Base.full_sanitizer.sanitize(unit_amenity.directional_text.present? ? unit_amenity.directional_text : "")
            if directional_text.size < description_limit
              show_directional_text = false
            else
              show_directional_text = true
            end
            # temp_data = {"name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => unit_amenity.description}
            json.gallery ["name" => unit_amenity.name, "image" => unit_amenity.image.present? ? unit_amenity.image.url : "no image", "description" => show_long_description ? stop_description[0..description_limit - 1] : stop_description,"show_long_description" => show_long_description ,"long_description" => (styling_start + unit.description + styling_end  rescue ""), "directional_text" => show_directional_text ? directional_text[0..description_limit - 1] : directional_text,"show_long_directional_text" => show_directional_text,"long_directional_text" => (styling_start + unit_amenity.directional_text + styling_end  rescue "")]
          else

            amenityGalleryArr = []
            # unit_amenity.description = nil
            amenityGalleryArr << unit_amenity
            unit_amenity.amenity_galleries.order(:sort).each do |amen|
              amenityGalleryArr << amen
            end
            json.gallery amenityGalleryArr do |ag|
              json.name ag.name
              json.image ag.image.url
              stop_description = ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")
              if stop_description.size < description_limit
                json.show_long_description false
                json.description stop_description
              else
                json.show_long_description true
                json.description stop_description[0..description_limit - 1]
              end
              json.long_description styling_start + ag.description + styling_end  rescue ""

              stop_description = ActionView::Base.full_sanitizer.sanitize(ag.directional_text.present? ? ag.directional_text : "")
              if stop_description.size < description_limit
                json.show_long_directional_text false
                json.directional_text stop_description
              else
                json.show_long_directional_text true
                json.directional_text stop_description[0..description_limit - 1]
              end              
              json.long_directional_text styling_start + ag.directional_text + styling_end  rescue ""
            end
          end

        end
      end
      # if unit_amenities_hit
      #   unit_amenities_array = [
      #       "x_plot" => 0,
      #       "y_plot" => 0,
      #       "name" => "No Image",
      #       "image" => image_url("no_image.png"),
      #       "stop_description" => nil,
      #       "directional_text" => nil,
      #       "gallery" => {"name" => "No Image",
      #                     "image" => image_url("no_image.png"),
      #                     "description" => nil,
      #                     "directional_text" => nil }
      #   ]
      #
      #   json.unit_amenities unit_amenities_array
      # end
      end
    elsif stop.stop_type == "elevator"
      elevator = Elevator.find_by_id stop.stop_id
      json.image elevator.image.present? ? elevator.image.url : asset_path("elev2.png")
      json.name elevator.name rescue "Elevator"
      # json.name elevator.name
      json.directional_text elevator.directional_text
      json.video_link_button_label ""
      json.video_link ""
      json.floorplate_image (elevator.floorplate.image.present? ? elevator.floorplate.image.url : nil) if elevator.floorplate.present?
      if new_stops_arr.compact[counter + 1].present?
        next_stop = new_stops_arr.compact[counter + 1]
        next_stop = next_stop.stop_type.classify.constantize.find next_stop.stop_id rescue nil
        if next_stop.is_a? Elevator
          elevator_stop_description = ""

          if hit
            current_stop = stop.stop_type.classify.constantize.find stop.stop_id rescue nil
            elevator_stop_description = current_stop.floors.present? ? ELEVATOR_STOP_TEXT + current_stop.floors.max.to_s : "" rescue ""
          else
            current_stop = stop.stop_type.classify.constantize.find stop.stop_id rescue nil
            elevator_stop_description =  current_stop.floors.present? ? ELEVATOR_STOP_TEXT + current_stop.floors.min.to_s : "" rescue ""
          end
        else
          elevator_stop_description =  next_stop.floor.present? ? ELEVATOR_STOP_TEXT + next_stop.floor.to_s : "" rescue ""
        end

      else
        elevator_stop_description = ELEVATOR_STOP_TEXT + min_floor.to_s
      end
      json.stop_description elevator_stop_description
      if elevator.elevator_galleries.count == 0
        json.gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator_stop_description, "directional_text" => elevator.directional_text]
      else
        # json.elevator_gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator.description]

        elevatorGalleryArr = []
        # elevator.description = nil
        elevatorGalleryArr << elevator
        elevator.elevator_galleries.each do |amen|
          elevatorGalleryArr << amen
        end
        json.gallery elevatorGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url
          json.description ag.description
          json.directional_text ag.directional_text
        end
      end

    elsif stop.stop_type == "amenity"
      amenity = Amenity.find stop.stop_id
      json.image amenity.image.present? ? amenity.image.url : "no image"
      stop_description = ActionView::Base.full_sanitizer.sanitize(amenity.description.present? ? amenity.description : "")
      if stop_description.size < description_limit
        json.show_long_description false
        json.stop_description stop_description
      else
        json.show_long_description true
        json.stop_description stop_description[0..description_limit - 1]
      end
      json.long_stop_description styling_start + amenity.description + styling_end  rescue ""

      json.name amenity.name
      directional_text = ActionView::Base.full_sanitizer.sanitize(amenity.directional_text.present? ? amenity.directional_text : "")
      if directional_text.size < description_limit
        json.show_long_directional_text false
      json.directional_text directional_text
      else
        json.show_long_directional_text true
      json.directional_text directional_text[0..description_limit - 1]
      end
      json.long_directional_text styling_start + amenity.directional_text + styling_end  rescue ""

      json.video_link_button_label amenity.video_link_button_label
      json.video_link amenity.video_link.present? ? amenity.video_link : ""
      if @scheduled_tour.present?
        rml = RemoteLock.find_by(edge_state_id: @community.edge_state.id , stop_id: stop.stop_id) if @community.edge_state.present?
        if rml.present?
          if @tour_user.present? and @tour_user.as_guests.find_by(community_id: @community.id).present?
            igloo_guest = IglooGuest.find_by(stop_id: stop.stop_id, tour_user_id: @tour_user.id, status: "active")
            if igloo_guest.nil? 
              pin = @tour_user.as_guests.find_by(community_id: @community.id).edgestate_pin if @tour_user.as_guests.find_by(community_id: @community.id).present?
              json.guest_pin "Use code " + pin + "# to enter." if pin.present? and rml.remote_lock_type != "igloo_lock"
              # json.guest_pin "Use code " + pin + " to enter." if pin.present? and rml.remote_lock_type == "igloo_lock"
            else
              json.guest_pin "Use code " + igloo_guest.guest_code + " to enter." if igloo_guest.guest_code.present?
            end
          else
            json.guest_pin ''
          end
        else
          _stop_ = Amenity.find_by_id stop.stop_id
          if _stop_.present? and _stop_.access_code.present?
            json.guest_pin "Use code " + _stop_.access_code + " to enter."
          else
            json.guest_pin ''
          end
        end
      else
        json.guest_pin ''
      end
      json.floorplate_image (amenity.amenityable.image.present? ? amenity.amenityable.image.url : nil) if amenity.amenityable.present?
      json.is_favorite favorite_amenity_array.include?(stop.stop_id.to_s) ? true : false
      if amenity.amenity_galleries.count == 0

        stop_description = ActionView::Base.full_sanitizer.sanitize(amenity.description.present? ? amenity.description : "")
        if stop_description.size < description_limit
          show_long_description = false
        else
          show_long_description = true
        end
        directional_text = ActionView::Base.full_sanitizer.sanitize(amenity.directional_text.present? ? amenity.directional_text : "")
        if directional_text.size < description_limit
          show_directional_text = false
        else
          show_directional_text = true
        end

        json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image","show_long_description" => show_long_description, "description" => show_long_description ? stop_description[0..description_limit - 1] : stop_description,"long_stop_description" => (styling_start + amenity.description + styling_end  rescue ""),"show_long_directional_text" => show_directional_text, "directional_text" => show_directional_text ? directional_text[0..description_limit - 1] : directional_text,"long_directional_text" => (styling_start + amenity.directional_text + styling_end  rescue "")]
      else
        # json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description]

        amenityGalleryArr = []
        # amenity.description = nil
        amenityGalleryArr << amenity
        amenity.amenity_galleries.order(:sort).each do |amen|
          amenityGalleryArr << amen
        end
        json.gallery amenityGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url


          stop_description = ActionView::Base.full_sanitizer.sanitize(ag.description.present? ? ag.description : "")
          if stop_description.size < description_limit
            json.show_long_description false
            json.description stop_description
          else
            json.show_long_description true
            json.description stop_description[0..description_limit - 1]
          end
          json.long_description styling_start + ag.description + styling_end  rescue ""

          stop_description = ActionView::Base.full_sanitizer.sanitize(ag.directional_text.present? ? ag.directional_text : "")
          if stop_description.size < description_limit
            json.show_long_directional_text false
            json.directional_text stop_description
          else
            json.show_long_directional_text true
            json.directional_text stop_description[0..description_limit - 1]
          end 
          json.long_directional_text styling_start + ag.description + styling_end  rescue ""

        end
      end
    end
    # binding.pry

    stop.stop_details.each do |sd|
      json.stop_description sd.description
    end
    stop.stop_galleries.each do |sg|
      json.stop_gallery_name sg.name
      json.stop_galerry_image sg.image.present? ? sg.image.url : "no image"
    end

    @existing_path_points = []
    if @community.show_map
      if i == 0
        @existing_path_points << {x_plot: tour.x_plot, y_plot: tour.y_plot} if i == 0
        path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: nil).first
        if path.blank?
          path = Path.where(map_path_to_id: nil, map_path_from_id: stop.stop_id).first
          @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
        else
          @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
        end
      else
        path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: new_stops_arr[i-1].stop_id).first
        if path.blank?
          path = Path.where(map_path_to_id: new_stops_arr[i-1].stop_id, map_path_from_id: stop.stop_id).first
          @existing_path_points << path&.path_points.reorder('id DESC') if path.present?
        else
          @existing_path_points << path&.path_points.reorder('id ASC') if path.present?
        end
        # @existing_path_points << path.path_points.reorder('id ASC') if path.present?
      end
    end  

    @existing_path_points.flatten!
    json.path_points @existing_path_points

    # binding.pry
    i+=1
    counter += 1
  end

end