module ToursHelper
  def path_start_point path
    case path.map_path_from_type
      when "Unit"
      start =  Unit.find(path.map_path_from_id).id
      when "Amenity"
      start =  Amenity.find(path.map_path_from_id).id
      when "Elevator"
      start =  Elevator.find(path.map_path_from_id).id
      when "BuildingStartingPoint"
      start =  BuildingStartingPoint.find(path.map_path_from_id).id
      else
      start = path.map_path_to_id.present? ? TourStop.find_by_stop_id(path.map_path_to_id).tour.id : TourStop.find_by_stop_id(path.map_path_from_id).tour.id
    end
	end

  def path_stop_point path
    case path.map_path_to_type
      when "Unit"
        stop =  Unit.find(path.map_path_id).id
      when "Amenity"
        stop =  Amenity.find(path.map_path_id).id
      when "Elevator"
        stop =  Elevator.find(path.map_path_id).id
      when "BuildingStartingPoint"
        stop =  BuildingStartingPoint.find(path.map_path_id).id
      else
        stop = path.map_path_to_id.present? ? TourStop.find_by_stop_id(path.map_path_to_id).tour.id : TourStop.find_by_stop_id(path.map_path_from_id).tour.id
    end
  end

  def is_version_supported params
    if params[:version].present?
      app_version = AppVersion.first
      PorticoRequest.create(app_name: params[:appName], user_id: params[:tour_user_id], os_type: params[:appPlatform], app_version: params[:version].to_i)
      app_version.update_attributes(portico_version: params[:version].to_i) if (params[:version].to_i > app_version.portico_version)
      if (params[:appPlatform] == "ios") && (params[:version].to_i >= ENV["MINIMUM_SUPPORTED_VERSION_FOR_IOS"].to_i)
        true
      elsif (params[:appPlatform] == "android") && (params[:version].to_i >= ENV["MINIMUM_SUPPORTED_VERSION_FOR_ANDROID"].to_i)
        true
      else
        false
      end
    else
      true
    end
  end
	
  def redirect_url app_name, os_type
		if os_type == "android"
			(app_name == "Pynwheel Tour") ? "https://play.google.com/store/apps/details?id=com.pynwheel.selftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour"
		else
			(app_name == "Pynwheel Tour") ? "https://itunes.apple.com/us/app/self-tour/id1488907392" : "https://itunes.apple.com/us/app/lincoln-property-self-tour/id1508997129"
		end
	end

	def get_version_access params
		if is_version_supported params
      allow_usage = true
      redirect_url = ""
    else
      allow_usage = false
      redirect_url = redirect_url(params[:appName], params[:appPlatform])
    end
    
    return allow_usage, redirect_url 
	end

  def duplicate_tour coummunity_tour
    customized_tour = coummunity_tour.dup
    
    if customized_tour.save!
      customized_tour
    else
      nil
    end
  end

  def remove_user_customized_tour user_customized_tour
    user_customized_tour.tour.tour_stops.delete_all if user_customized_tour.tour && user_customized_tour.tour.tour_stops.present?
    tour = user_customized_tour.tour if user_customized_tour.tour.present?
    user_customized_tour.delete
    tour.delete if tour.present?
  end

end
