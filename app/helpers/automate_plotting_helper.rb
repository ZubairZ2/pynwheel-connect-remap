module AutomatePlottingHelper

  def hide_floor_or_not_against_building_starting_point(building_list, building, floors, floor)
    (building_list.first == building && floors.first == floor) || (building_list.last == building && floors.first == floor)
  end

  def hide_floor_or_not_against_building(building_list, building, floors, floor)
    building_list.first == building && floors.first == floor
  end
  def hide_floor_or_not_against_floor(floors, floor)
    floors.first == floor
  end
  def fetch_hidden_class_for_building_with_floors(building_list, building, floors, floor)
    hide_floor_or_not_against_building(building_list, building, floors, floor) ? "" : "hidden"
  end
  def fetch_hidden_class_for_floors(floors, floor)
    hide_floor_or_not_against_floor(floors, floor) ? "" : "hidden"
  end

end
