class CommunityTour
  def initialize community, tour_user, building_list, floor_list_loop, floor_list_temp
    @community = community
    @tour_user = tour_user
    @building_list = building_list
    @floor_list_loop = floor_list_loop
    @floor_list_temp = floor_list_temp

    @favorite_unit_array = []
    @favorite_amenity_array = []
    @stops_arr = []

    @scheduled_tour_stops = @community.community_tour_available_stops(@tour_user)
  end

  def get_tour_stops
    get_favorite_stops()

    if @community.is_sitemap
      get_sitemap_tour_stops()
    else
      get_floorplate_tour_stops()
    end

    get_finalized_tour_stops_list_for_self_tour()
  end

  private

  def get_finalized_tour_stops_list_for_self_tour available_stops = []
    @stops_arr.uniq.compact.each do |stop|
      unless stop.stop_type == "elevator" || (stop.latitude.present? && (stop.latitude + stop.longitude) < 1) && @community.show_map
        name = ""
        is_favorite = ""

        if stop.stop_type == "unit"
          u = Unit.find_by_id stop.stop_id
          
          if u.present? && (u.available || u.modal_unit)
            name = (u.building.present? ? (u.building + "-") : "") + u.marketing_name + ((u.floorplan.bedrooms.present? ? " (" + u.floorplan.bedrooms.to_i.to_s + " BR)" : "") rescue "")
            is_favorite = @favorite_unit_array.include?(stop.stop_id.to_s) ? true : false
          else
            next
          end

        else
          name =  stop.name
          is_favorite = @favorite_amenity_array.include?(stop.stop_id.to_s) ? true : false
        end

        new_stop = stop.stop_type.classify.constantize.find_by_id(stop.stop_id)

        available_stops << {
          "name": name,
          "is_favorite": is_favorite,
          "id": stop.id,
          "type": stop.name,
          "floor": @community.is_sitemap ? "" : new_stop&.floor,
          "building": @community.is_sitemap ? "" : new_stop&.building
        }

      end
    end

    available_stops
  end

  def get_sitemap_tour_stops
    if @scheduled_tour_stops.present?
      @stops_arr = @community.mdu ? @scheduled_tour_stops : @scheduled_tour_stops.where.not(stop_type: "unit").order(:sort)
    else
      @stops_arr =  @community.mdu ? @community.tour.tour_stops.where(display_stop: true).order(:sort) : @community.tour.tour_stops.where(display_stop: true, stop_type: "amenity").order(:sort)
    end
  end

  def get_floorplate_tour_stops
    add_start = true

    if @scheduled_tour_stops.present?
      @stops_arr = @community.mdu ? @scheduled_tour_stops : @scheduled_tour_stops.where.not(stop_type: "unit").order(:sort)
      
    else
      @building_list << "" if @building_list == []
      @building_list.each do |building|
        @floor_list_loop = (@floor_list_temp.present? && add_start) ? @floor_list_temp : @floor_list_temp
        add_start = false
        @floor_list_loop.each do |floor|
          if @community.tour.sort_hash[building + ","+ floor.to_s].present?
            @community.tour.sort_hash[building + ","+ floor.to_s].each do |s_id|
              if (s_id.present?)
                stop = (TourStop.find_by_id(s_id))
                @stops_arr << stop if (stop.display_stop && (@community.mdu ? true : (stop.stop_type != "unit")) ) rescue next
              end
            end
          end
        end
      end
    end
  end

  def get_filtered_tour_stops
    @stops_arr = @community.filter_final_stops(@stops_arr.compact)
  end

  def get_favorite_stops
    fs = @community.favorite_stop.present? ? @community.favorite_stop : FavoriteStop.new
    @favorite_unit_array = (fs.present? ? fs.favorite_unit : []) + (fs.user_favorites_unit[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_unit[@tour_user.email] : [])
    @favorite_amenity_array = (fs.user_favorites_amenity[(@tour_user.present? ? @tour_user.email : nil)].present? ? fs.user_favorites_amenity[@tour_user.email] : [])
  end

end