class Buildings
  def initialize(community, tour_user)
    @community = community
    @tour_user =  tour_user
    @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
  end

  def get_community_buildings
    building_list = []
    building_list = @community.units.map{|x| x.building rescue next}.uniq.compact + @community.amenities.map{|x| x.building rescue next}.uniq.compact
    building_list = building_list.compact.reject { |c| c.empty? }.uniq.sort
    building_list = building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(building_list).sort.map{|x,y| y}
    @community.community_tour.building_order.present? ? (building_list =  @community.community_tour.building_order) : building_list
  end
  
end