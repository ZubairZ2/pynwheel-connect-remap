i = 0
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
    json.show_camera_button @community.show_camera_button

    json.visual_id_verification tour.visual_id_verification
    json.chat_control @community.chat_control
    json.show_map @community.show_map
    json.mdu @community.mdu
  end
  json.is_sitemap @community.is_sitemap
  if @community.is_sitemap
    json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)

  else
    @floorplate = @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    json.image @floorplate.image

  end
  if @community.show_map

    ts = @community.mdu ? tour.tour_stops.where.not(id: @community.deleted_ids).order(:sort) : tour.tour_stops.where.not(id: @community.deleted_ids, stop_type: "unit").order(:sort)
    ts1 = tour.tour_stops.where(id: @community.deleted_ids).map{|x| x.id}

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

      stops_arr = @community.mdu ? @community.tour.tour_stops.where(display_stop: true).order(:sort) : @community.tour.tour_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 3]
      last_stop_desc = stops_arr.compact[stop_count - 2]
    else
      temp_max_floor = nil
      min_floor = @community.floorplates.map{|f| f.floors}.flatten.min
      @community.floorplates.map{|f| f.floors}.flatten.sort.each do |floor|

        begin
          if @community.tour.sort_hash[floor.to_s].present?
            arr_to_remove = @community.tour.sort_hash[floor.to_s].grep(/\d+/, &:to_i) - @community.deleted_ids
            if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.count == 1 && (min_floor != floor) && (arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.include? "elevator")
              begin
                # unless ((TourStop.find arr_to_remove).map{|x| (Elevator.find x.stop_id).floors.max - 1 if x.stop_type == "elevator"}).include? floor
                next
                # end
              rescue
              end
            end
            temp_max_floor = floor
            @community.tour.sort_hash[floor.to_s].each do |s_id|
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
  


    stops = @community.mdu ? tour.tour_stops : tour.tour_stops.where.not(stop_type: "unit")
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

      stops_arr = @community.mdu ? @community.tour.tour_stops.where(display_stop: true).order(:sort) : @community.tour.tour_stops.where.not(display_stop: false,stop_type: "unit").order(:sort)
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop_desc = stops_arr.compact[stop_count - 1]
    else
      temp_max_floor = nil
      min_floor = @community.floorplates.map{|f| f.floors}.flatten.min
      @community.floorplates.map{|f| f.floors}.flatten.sort.each do |floor|

        begin
          if @community.tour.sort_hash[floor.to_s].present?
            arr_to_remove = @community.tour.sort_hash[floor.to_s].grep(/\d+/, &:to_i) - @community.deleted_ids
            if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.count == 1 && (min_floor != floor) && (arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.include? "elevator")
              begin
                # unless ((TourStop.find arr_to_remove).map{|x| (Elevator.find x.stop_id).floors.max - 1 if x.stop_type == "elevator"}).include? floor
                next
                # end
              rescue
              end
            end
            temp_max_floor = floor
            @community.tour.sort_hash[floor.to_s].each do |s_id|
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
      stop_count = stops_arr.compact.count
      second_last = stops_arr.compact[stop_count - 2]
      last_stop_desc = stops_arr.compact[stop_count - 1]
      blocked = []
      last_stop = stops_arr.compact[stops_arr.compact.size - 1]
    end
    #########-------------------- End tour stop sort-----------------------
    new_stops_arr = stops_arr.compact
    json.path_points []
    # new_stops_arr = @community.mdu ? tour.tour_stops : tour.tour_stops.where.not(stop_type: "unit")
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
      next if (stop.latitude + stop.longitude) < 1
    else
      next if stop.stop_type == "elevator"
    end
    # next if !@community.mdu && stop.stop_type == "unit"
    navigation_title = ""
    if second_last.id == stop.id
      navigation_title = @community.show_map ? ("Last Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
      hit = false
    elsif last_stop_desc.id == stop.id
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Last Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    elsif new_stops_arr[counter + 1].present?
      navigation_title = @community.show_map ? ("Next Stop: " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?) : ("Next Stop: " + new_stops_arr[counter].name if new_stops_arr[counter].present?) rescue ""
    end
    if (navigation_title.include? "elevator") || (navigation_title.include? "Elevator")
      navigation_title = "Next Stop: Elevator"
    end
    json.navigation_title navigation_title
    json.id stop.id
    json.x_plot stop.latitude
    json.y_plot stop.longitude
    json.unit_id stop.stop_id
    if params[:testing].present?
      if stop.stop_type == 'amenity' then json.type 'elevator' else json.type stop.stop_type end
    else
      json.type stop.stop_type
    end
    if stop.stop_type == "unit"

      unit = Unit.find_by_id stop.stop_id
      if unit.present?
      json.image unit.present? ? (unit.image.present? ? unit.image.url: (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
      json.name  "Apartment "+ (unit.building.present? ? (unit.building + "-") : "") + unit.marketing_name
      json.floorplate_image (unit.floorplate.image.present? ? unit.floorplate.image.url : nil) if unit.floorplate.present?
      json.video_link_button_label unit.virtual_tour_button_label
      json.video_link unit.virtual_tour_url.present? ? unit.virtual_tour_url : ""
      lease_pricing = []
      if unit.lease_pricing.present? && !unit.modal_unit
        str_split = unit.lease_pricing.split(';')
        str_split.each do |ss|
          str = ss.split(':')

          pricing_str = str[0]+" Month - $"+str[1]
          # h = {"pricing_option" => pricing_str}
          lease_pricing << pricing_str

        end
        lease_pricing = lease_pricing.sort_by {|x| x[0..1].to_i}
        lease_pricing2 = []
        lease_pricing.each do |lp|
          lease_pricing2 << {"pricing_option" => lp}
        end
        lease_pricing = lease_pricing2
      else
        h = {"pricing_option" => "$"+ unit.effective_rent.to_s}
        lease_pricing << h
      end
      if unit.modal_unit
        lease_pricing = []
        @units = Unit.where('floorplan_id = ? AND community_id = ? AND available = ? AND available_date > ?', unit.floorplan_id,unit.community_id,true, Date.today) if unit.present?
        @units.each do |floorplan_unit|
          unless floorplan_unit.id == unit.id
            pricing_str = {"pricing_option" => floorplan_unit.marketing_name + " $" + floorplan_unit.effective_rent.to_s} rescue next
            lease_pricing << pricing_str
          end
        end
        lease_pricing = lease_pricing.sort_by!(&:zip)
      end
      stop_dat = {"floorplan" => Floorplan.find_by(id: unit.floorplan.id).name,"effective_rent" => unit.effective_rent,"available_date" => unit.available_date,"lease_pricing" => lease_pricing,"availability" => unit.availability,"stop_description" => unit.stop_description, "availability_url"=> unit.availability_url.present? ? unit.availability_url :  Floorplan.find_by(provider_floorplan_id: unit.floorplan_id).availability_url}
      json.stop_data stop_dat
      @unit_amenities = unit.amenities #Amenity.where(community_id: @community.id, amenityable_type: "Unit", amenityable_id: stop.stop_id)
      unit_amenities_hit = true
      json.unit_amenities @unit_amenities.order(:sort) do |unit_amenity|
        if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
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
            unit_amenity.amenity_galleries.each do |amen|
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
      json.name "Elevator"#elevator.description
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
            elevator_stop_description = current_stop.floors.present? ? "Go to floor " + current_stop.floors.max.to_s : "" rescue ""
          else
            current_stop = stop.stop_type.classify.constantize.find stop.stop_id rescue nil
            elevator_stop_description =  current_stop.floors.present? ? "Go to floor " + current_stop.floors.min.to_s : "" rescue ""
          end
        else
          elevator_stop_description =  next_stop.floor.present? ? "Go to floor " + next_stop.floor.to_s : "" rescue ""
        end

      else
        elevator_stop_description = "Go to floor " + min_floor.to_s
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
      json.stop_description amenity.description
      json.name amenity.name
      json.directional_text amenity.directional_text
      json.video_link_button_label amenity.video_link_button_label
      json.video_link amenity.video_link.present? ? amenity.video_link : ""
      json.floorplate_image (amenity.amenityable.image.present? ? amenity.amenityable.image.url : nil) if amenity.amenityable.present?
      if amenity.amenity_galleries.count == 0
        json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description, "directional_text" => amenity.directional_text]
      else
        # json.gallery ["name" => amenity.name,"type" => "unit_stop", "image" => amenity.image.present? ? amenity.image.url : "no image", "description" => amenity.description]

        amenityGalleryArr = []
        # amenity.description = nil
        amenityGalleryArr << amenity
        amenity.amenity_galleries.each do |amen|
          amenityGalleryArr << amen
        end
        json.gallery amenityGalleryArr do |ag|
          json.name ag.name
          json.type "unit_stop"
          json.image ag.image.url
          json.description ag.description
          json.directional_text ag.directional_text
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