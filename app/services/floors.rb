class Floors
  def initialize(community, tour_user)
    @community = community
    @tour_user = tour_user
    @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
  end

  def get_community_floors
    @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue []
  end

  def get_community_temp_floors floor_list
    begin
      if @tour.starting_floor.present?
        (floor_list - [@tour.starting_floor]).unshift(@tour.starting_floor) rescue []
      else
        floor_list
      end
    rescue
      []
    end
  end

end