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
  json.is_sitemap @community.is_sitemap
  if @community.is_sitemap
    json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)

  else
    @floorplate = @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    json.image @floorplate.image

  end
  ts = tour.tour_stops.where.not(id: @community.deleted_ids).order(:sort)
  ts1 = tour.tour_stops.where(id: @community.deleted_ids).map{|x| x.id}

  @community.is_sitemap ? sp = Path.where(map_path_from_id: ts&.last&.stop_id, map_path_to_id: nil)&.first : sp = Path.where(map_path_from_id: ts.where(stop_type: "elevator").first.stop_id, map_path_to_id: nil)&.first rescue nil
  if sp.blank?
    @community.is_sitemap ? sp = Path.where(map_path_from_id: nil, map_path_to_id: ts&.last&.stop_id)&.first : sp = Path.where(map_path_from_id: nil, map_path_to_id: ts.where(stop_type: "elevator").first.stop_id)&.first rescue nil
    json.path_points sp.present? ? sp.path_points.reorder('id DESC') : []
  else
    json.path_points sp.present? ? sp.path_points.reorder('id ASC') : []
  end
  stops_arr = []
  if @community.is_sitemap
    stops_arr = @community.tour.tour_stops
    stop_count = stops_arr.count
  else
    temp_max_floor = nil
    min_floor = @community.floorplates.map{|f| f.floors}.flatten.min
    @community.floorplates.map{|f| f.floors}.flatten.sort.each do |floor|

      begin
        if @community.tour.sort_hash[floor.to_s].present?
          arr_to_remove = @community.tour.sort_hash[floor.to_s].grep(/\d+/, &:to_i) - @community.deleted_ids
          if arr_to_remove.map{|x| ((TourStop.find_by_id x).stop_type rescue nil) }.uniq.count == 1 && (min_floor != floor)
            begin
              unless ((TourStop.find arr_to_remove).map{|x| (Elevator.find x.stop_id).floors.max - 1 if x.stop_type == "elevator"}).include? floor
                next
              end
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
            stops_arr << (TourStop.find_by_id(s_id)) if (s_id.present? )
          end
        end
      rescue
      end
    end
    stop_count = stops_arr.compact.count
    second_last = stops_arr.compact[stop_count - 2]
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


  stops = tour.tour_stops
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
  new_stops_arr

  hit = true
  counter = 0
  json.navigation_title "First Stop " + new_stops_arr[0].name if new_stops_arr[0].present?
  json.tour_stop new_stops_arr.compact do |stop|
    # if counter == 0
    #   json.navigation_title "First Stop " + new_stops_arr[counter].name if new_stops_arr[counter].present?
    if second_last.id == stop.id
      json.navigation_title "Last Stop " + new_stops_arr[counter + 1].name if new_stops_arr[counter + 1].present?
      hit = false
    elsif hit
      json.navigation_title "Next Stop " + new_stops_arr[counter].name if new_stops_arr[counter].present?
    end

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
      json.name  "Apartment "+ unit.marketing_name
      json.floorplate_image (unit.floorplate.image.present? ? unit.floorplate.image.url : nil) if unit.floorplate.present?
      lease_pricing = []
      if unit.lease_pricing.present?
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
      if unit_amenities_hit
        unit_amenities_array = {
            "x_plot" => 0,
            "y_plot" => 0,
            "name" => "No Image",
            "image" => image_url("no_image.png"),
            "stop_description" => nil,
            "directional_text" => nil,
            "gallery" => {"name" => "No Image",
                          "image" => image_url("no_image.png"),
                          "description" => nil,
                          "directional_text" => nil }
        }
        json.unit_amenities unit_amenities_array
      end
      end
    elsif stop.stop_type == "elevator"
      elevator = Elevator.find_by_id stop.stop_id
      json.image elevator.image.present? ? elevator.image.url : asset_path("elev2.png")
      json.stop_description elevator.description
      json.name elevator.name
      json.directional_text elevator.directional_text
      json.floorplate_image (elevator.floorplate.image.present? ? elevator.floorplate.image.url : nil) if elevator.floorplate.present?
      if new_stops_arr.compact[counter + 1].present?
        next_stop = new_stops_arr.compact[counter + 1]
        next_stop = next_stop.stop_type.classify.constantize.find next_stop.stop_id
        if next_stop.is_a? Elevator
          json.elevator_title ""
        else
          json.elevator_title next_stop.floor.present? ? "Go to floor " + next_stop.floor.to_s : ""
        end

      else
        json.elevator_title ""
      end
      if elevator.elevator_galleries.count == 0
        json.gallery ["name" => elevator.name,"type" => "unit_stop", "image" => elevator.image.present? ? elevator.image.url : "no image", "description" => elevator.description, "directional_text" => elevator.directional_text]
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

    @existing_path_points.flatten!
    json.path_points @existing_path_points


    # binding.pry
    i+=1
    counter += 1
  end

end