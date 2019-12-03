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
  json.image tour.image.present? ? tour.image.url : (@community.is_sitemap ? @community.sitemap.image.url : @community.floorplates.first.image.url)
  json.path_points tour.path.present? ? tour.path.path_points.reorder('id ASC') : []

  stops = tour.tour_stops
  json.tour_stop tour.tour_stops.order(:sort) do |stop|
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
      json.image unit.present? ? (unit.image.present? ? unit.image.url: (unit.floorplan.image.present? ? unit.floorplan.image.url : "no image") ): "no image"
      json.name  "Apartment "+unit.marketing_name
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
      json.unit_amenities @unit_amenities.order(:sort) do |unit_amenity|
        if unit_amenity.x_plot.present? && (unit_amenity.x_plot + unit_amenity.y_plot > 0)
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
    elsif stop.stop_type == "elevator"
      elevator = Elevator.find_by_id stop.stop_id
      json.image elevator.image.present? ? elevator.image.url : File.open(asset_path("elev2.png"))
      json.stop_description elevator.description
      json.name elevator.name
      json.directional_text elevator.directional_text
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
      stop.stop_type.classify.constantize.find_by_id(stop.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') }
    else
      # tour.tour_stops[i-1].stop_id
      path = Path.where(map_path_to_id: tour.tour_stops[i].stop_id, map_path_to_type: tour.tour_stops[i].stop_type.classify.constantize,
                      map_path_from_id: tour.tour_stops[i-1].stop_id, map_path_from_type: tour.tour_stops[i-1].stop_type.classify.constantize ).first
      if path.blank?
        path = Path.where(map_path_to_id: tour.tour_stops[i-1].stop_id, map_path_to_type: tour.tour_stops[i-1].stop_type.classify.constantize,
                          map_path_from_id: tour.tour_stops[i].stop_id, map_path_from_type: tour.tour_stops[i].stop_type.classify.constantize ).first
      end
      @existing_path_points << path.path_points.reorder('id ASC') if path.present?
    end

    @existing_path_points.flatten!
    json.path_points @existing_path_points
    

    # binding.pry

    i+=1
  end

end