class Floors
  def initialize(community)
    @community = community
  end

  def get_community_floors
    @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue []
  end

  def get_community_temp_floors floor_list
    (floor_list - [@community.tour.starting_floor]).unshift(@community.tour.starting_floor) if @community.tour.starting_floor.present? rescue []
  end

end