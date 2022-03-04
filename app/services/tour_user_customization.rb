class TourUserCustomization
  def initialize(community, tour_user)
    @community = community
    @tour_user = tour_user
    @c_tour = @community.tour
    @user_customized_tour = TourAvailableStops.new(@community, @tour_user).get_user_tour
  end

  def customize_tour
    return unless is_customization_enabled
    
    unless @user_customized_tour.present?
      t_tour = create_tour_user_customize_tour()
      add_tour_stops_for_tour_user(t_tour)
      set_tour_user_sort_hash(t_tour) unless @community.is_sitemap
    end
  end

  private

  def is_customization_enabled
    @community.tour&.tour_setting&.enable_tour_customization
  end

  def add_tour_stops_for_tour_user t_tour
    t_tour.tour_stops.delete_all

    stops = @c_tour.tour_stops.where(display_stop: true)

    stops.each do |stop|
      new_stop = stop.dup
      new_stop.tour_id = t_tour.id
      new_stop.save(:validate => false)
    end
    
  end

  def create_tour_user_customize_tour
    tour = @c_tour.dup
    tour.tour_user_id = @tour_user.id

    unless @community.is_sitemap
      sort_hash = tour.sort_hash
      sort_hash.each do |key, array|
        tour.sort_hash["#{key}"] = []
      end
    end

    tour.save(:validate => false)
    tour
  end

  def set_tour_user_sort_hash t_tour

    @building_list = Buildings.new(@community, @tour_user).get_community_buildings
    @floor_list = Floors.new(@community, @tour_user).get_community_floors

    @building_list << "" 
    @building_list.each do |building|
      if @floor_list.present?
        @floor_list.each do |floor|
          if @community.tour.sort_hash[building + ","+ floor.to_s].present?
            @community.tour.sort_hash[building + ","+ floor.to_s].each do |s_id|
              if (s_id.present?)
                stop = (TourStop.find_by_id(s_id))
                new_stop = TourStop.where(stop_id: stop.stop_id, tour_id: t_tour.id).last if stop.present?

                if new_stop.present?
                  unless t_tour.sort_hash[building + ","+ floor.to_s].include?(new_stop.id.to_s)
                    t_tour.sort_hash[building + ","+ floor.to_s] << new_stop.id
                  end
                end
              end
            end
          end
        end
      end
    end

    t_tour.save!

  end
end