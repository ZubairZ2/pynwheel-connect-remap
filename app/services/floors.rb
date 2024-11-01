class Floors
  def initialize(community)
    @community = community
  end

  def get_community_floors
    @community.floorplates.map{|x| x.floors}.flatten!.distinct.sort rescue []
  end

  def get_community_temp_floors floor_list
    begin
      if @community.community_tour.starting_floor.present?
        (floor_list - [@community.community_tour.starting_floor]).unshift(@community.community_tour.starting_floor) rescue []
      else
        floor_list
      end
    rescue
      []
    end
  end

end