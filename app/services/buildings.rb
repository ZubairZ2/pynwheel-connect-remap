class Buildings
  def initialize(community)
    @community = community
  end

  def get_community_buildings
    building_list = @community.units.map{|x| x.building rescue next}.uniq.compact + @community.amenities.map{|x| x.building rescue next}.uniq.compact
    building_list = building_list.compact.reject { |c| c.empty? }.uniq.sort
    building_list = building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(building_list).sort.map{|x,y| y}
    @community.tour.building_order.present? ? (building_list =  @community.tour.building_order) : ""
  end  
end