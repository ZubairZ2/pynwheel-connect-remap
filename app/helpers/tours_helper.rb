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
end
