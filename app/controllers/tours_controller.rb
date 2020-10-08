class ToursController < ApplicationController
  def index

    @community = Community.find params[:community_id]
    @tours = @community.tour || @community.create_tour
    @tour_stops = @tours.present? ? @tours.tour_stops : nil
    @tour_setting = @tours.tour_setting ||  @tours.create_tour_setting
    @community_opening_hours = @community.opening_hours.order(:sort).all


    @tour_elevator_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "elevator").map{|x| x.stop_id}

    @floorplates = @community.floorplates unless @community.is_sitemap
    @existing_stops = []


    @existing_path_points = []
    @building_list = []
    floor_choice = []
    building_choice = []

    @floor = nil
    
    
    # @floor_list = @community.floorplates.where(building: @building).map{|x| x.floors}.flatten!.sort rescue nil
    @floor_list = @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue nil
    params[:floorNo] = params[:floorNo].present? ? params[:floorNo] : @floor_list.first rescue nil
    #########################################################################
    # @tour_stops.where.not(stop_type: "elevator").map{|x| @building_list << x.stop_type.classify.constantize.find_by_id(x.stop_id).building}
    @building_list = @community.units.map{|x| x.building rescue next}.uniq.compact + @community.amenities.map{|x| x.building rescue next}.uniq.compact

    @building_list = @building_list.compact.reject { |c| c.empty? }.uniq
    @building_list = @building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(@building_list).sort.map{|x,y| y}
    
    @building = params[:building].present? ? params[:building] : @building_list[0]
    ########################################################################
    
    unless params[:floorNo].present?
      params[:floorNo] = @community.floorplates.map{|f| f.floors}.flatten.sort[0].to_s
    end
    building_choice = @building == @building_list[0] ? ['',nil,@building] : [@building]
    
    if params[:floorNo].present? && !@community.is_sitemap
      
    floor_choice = (params[:floorNo].to_i == @floor_list[0]) ? [nil,params[:floorNo].to_i] : [params[:floorNo].to_i]
      @floor = params[:floorNo]
      @sitemap =  @community.floorplates.select{|f| f.floors.include?(params[:floorNo].to_i)}.first
      if @community.show_map
        
        @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id} & @sitemap.amenities.where(floor: floor_choice, building: building_choice).map{|x| x.id}
      else
        @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id} & @community.amenities.where(floor: floor_choice,building: building_choice).map{|x| x.id}
      end

      if @community.show_map
        
        @tour_unit_array =  @community.mdu ? TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}  & @sitemap.units.map{|x| x.id if (floor_choice.include? x.floor)  && (building_choice.include? x.building ) } | @community.units.where( floor: floor_choice,building: building_choice,modal_unit:  true).ids : []
      else
        @tour_unit_array =  @community.mdu ? TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}  & @community.units.map{|x| x.id if (floor_choice.include? x.floor) && (building_choice.include? x.building ) } | @community.units.where(floor: floor_choice,building: building_choice,modal_unit:  true).ids : []
      end

    else
      @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id}
      @tour_unit_array =  @community.mdu ? TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id} | @community.units.where( modal_unit: true).ids : []
      @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    end

    @building_starting_points = @community.building_starting_point.where( floor: @floor.to_i)
    @all_stops = @tour_amenity_array | @tour_unit_array | @community.elevators | @building_starting_points.map{|x| x.id}
    floorplate_units = []
    floorplate_units = TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}  & @sitemap.units.where.not(floor: @floor.to_i).map{|x| x.id} if @floor.present?
    # @community.tour.tour_stops.order(:sort).each {|x| x.stop_type.classify.constantize.find_by_id(x.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') if z.path_points.present? } if (x.present? && @all_stops.include?(x.stop_id)) }
    # @community.tour.tour_stops.order(:sort).each {|x| x.stop_type.classify.constantize.find_by_id(x.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') if (z.path_points.present? &&  !floorplate_units.include?(z.map_path_from_id) && !z.map_path_from_id.nil? ) } if (x.present? && @all_stops.include?(x.stop_id)) }
    begin
      floorplate_elevators = TourStop.where(tour_id: @community.tour.id,stop_type: "elevator").map{|x| x.stop_id if   (Elevator.find_by(id: x.stop_id.to_i).floors.include?(@floor.to_i) and (building_choice.include? (Elevator.find_by(id: x.stop_id.to_i).building))  )}.compact
    rescue
      floorplate_elevators = nil
    end
    # f = floorplate_elevators.each{|z| Elevator.find(z).id}

    # floorplate_elevators.each{|z| Elevator.find(z).paths.each{|path| @existing_path_points << path.path_points.reorder('id ASC') if (@tour_unit_array.include?(path.map_path_from_id) || @tour_amenity_array.include?(path.map_path_from_id) ||  @tour_unit_array.include?(path.map_path_to_id) || floorplate_elevators.include?(path.map_path_from_id)) }}
    ele_ids = []
    @community.floorplates.map{|x|  ele_ids << x.id if x.floors.include?(1)}

    @community.tour.tour_stops.order(:sort).each do |stop|

      next if !@community.mdu && stop.stop_type == "unit"
      next if  !(@all_stops.include?(stop.id)) && !(floorplate_elevators.include?(stop.stop_id)) && !@community.is_sitemap rescue ''
      to_sp_path = Path.where(map_path_to_id: nil, map_path_from_id: stop.stop_id).first if (!@community.is_sitemap && (@floor.to_i == (@tours.starting_floor.present? ? @tours.starting_floor : @community.floorplates.map{|f| f.floors}.flatten.min.to_i)))
      if !@community.is_sitemap
        begin

        if (floor_choice.include?(@tours.starting_floor) && building_choice.include?(@tours.building))       
          @community.tour.tour_stops.where(stop_id: @all_stops).map{|x|           @existing_path_points <<           Path.find_by(map_path_from_id: nil, map_path_to_id: x.stop_id).path_points rescue next} 
          @community.tour.tour_stops.where(stop_id: @all_stops).map{|x|           @existing_path_points <<           Path.find_by(map_path_from_id: x.stop_id, map_path_to_id: nil).path_points rescue next}
        
        end
        rescue
          floorplate_elevators = nil
        end
        # from_sp_path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: nil).first if ( (@floor.to_i == (@tours.starting_floor.present? ? @tours.starting_floor : @community.floorplates.map{|f| f.floors}.flatten.min.to_i)))
      else
        from_sp_path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: nil).first
        @existing_path_points << from_sp_path.path_points.reorder('id ASC') if (from_sp_path.present?)
        @existing_path_points << to_sp_path.path_points.reorder('id ASC') if (to_sp_path.present?)
      end
      # @existing_path_points << from_sp_path.path_points.reorder('id ASC') if (from_sp_path.present?)
      # @existing_path_points << to_sp_path.path_points.reorder('id ASC') if (to_sp_path.present?)
    end
    
    @community.tour.tour_stops.where(stop_id: @all_stops).map{|x|           @existing_path_points <<            @community.tour.tour_stops.where(stop_id: @all_stops).map{|y| Path.find_by(map_path_from_id: x.stop_id, map_path_to_id: y.stop_id).path_points.reorder('id ASC') unless x == y rescue next}.compact                              }
    
    
    @all_stops


    # @existing_path_points << @tours.path_points.reorder('id ASC') if @tours.path.present?
    @existing_path_points.flatten!
    @existing_path_points
    @existing_stops << Unit.where(id: @tour_unit_array) if @community.mdu
    @existing_stops << Amenity.where(id: @tour_amenity_array)
    @existing_stops << Elevator.where(id: @tour_elevator_array)
    @existing_stops << BuildingStartingPoint.where(id: @building_starting_points)
    
    if @community.show_map
      
      @amenities = @community.is_sitemap ? @community.amenities : (@sitemap.amenities.present? ? @sitemap.amenities.where(floor: floor_choice,building: building_choice) : []) rescue []
    else
      am = []
      TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").each{|x| am << (Amenity.find_by_id x.stop_id)}
      @amenities = @community.amenities - am.compact
    end
    @elevators = @community.elevators
    if @community.show_map
      @units = @community.is_sitemap ? @community.units : (@sitemap.units.map{|x| x if x.floor == @floor.to_i && (building_choice.include? x.building )}).compact rescue []
    else
      un = []
      TourStop.where(tour_id: @community.tour.id,stop_type: "unit").each{|x| un << (Unit.find_by_id x.stop_id)}
      @units = @community.is_sitemap ? (@community.units - un.compact) : (@community.units.where(floor: @floor.to_i,building: building_choice) - un.compact)
    end

    #/////////////////////////////////// new
    # @units = []
    # @amenities = []
    # @elevators = []
    # @tour_stops_list  = []
    # @all_stops = []
    # @existing_path_points = []
    # default_first_floor = @community.floorplates.map{|f| f.floors}.flatten.sort.first unless @community.is_sitemap
    # start_point_floor = @tours.starting_floor.present? ? @tours.starting_floor : @community.floorplates.map{|f| f.floors}.flatten.sort.first unless @community.is_sitemap
    # all = @tours.tour_stops.map{|x| [x , (x.stop_type.classify.constantize.find_by_id x.stop_id)]}
    # all.each do |stop|
      
    #   if stop[1].is_a? Unit
    #     if ([@floor.to_i,nil].include? stop[1].floor)  && ([@building,nil].include? stop[1].building) || @community.is_sitemap
    #       @tour_stops_list << stop[0]
    #       @units << stop[1]
    #       @all_stops << stop[0].stop_id
    #     end
    #   end
    #   if stop[1].is_a? Elevator
    #     if stop[1].floors.include?(@floor.to_i) && ([@building,nil].include? stop[1].building) || @community.is_sitemap
    #       @tour_stops_list << stop[0]
    #       @elevators << stop[1] 
    #       @all_stops << stop[0].stop_id
    #     end
    #   end
    #   if stop[1].is_a? Amenity
    #     if ([@floor.to_i,nil].include? stop[1].floor) &&([@building,nil].include? stop[1].building) || @community.is_sitemap
    #       @tour_stops_list << stop[0]
    #       @amenities << stop[1]
    #       @all_stops << stop[0].stop_id
    #     end
    #   end
    # end
    
    # @tour_stops_list.each_with_index do |st,i|
    #   if (start_point_floor.to_i == @floor.to_i) || @community.is_sitemap
    #     from_sp_path = Path.where(map_path_to_id: st.stop_id, map_path_from_id: nil).first
    #     from_sp_path = Path.where(map_path_to_id: nil, map_path_from_id: st.stop_id).first unless from_sp_path.present?
    #     @existing_path_points << from_sp_path.path_points.reorder('id ASC') if (from_sp_path.present?)
    #   end
    #   @tour_stops_list.each_with_index do |st1,j|
    #     next if j >= i
    #     from_sp_path = nil
    #     from_sp_path = Path.where(map_path_to_id: st.stop_id, map_path_from_id: st1.stop_id).first
    #     from_sp_path = Path.where(map_path_to_id: st1.stop_id, map_path_from_id: st.stop_id).first unless from_sp_path.present?
    #     @existing_path_points << from_sp_path.path_points.reorder('id ASC') if (from_sp_path.present?)
        
    #   end

    # end
    # @existing_path_points.flatten!
    
    # puts "grgr"

  


    # @modal_unit = @community.is_sitemap ? @community.units.where(modal_unit: true) : @community.units.where( floor: @floor.to_i, modal_unit: true)
    # @units = @units + @modal_unit
  end
  def parameters
    @community = Community.find params[:community_id]
    @tours = @community.tour || @community.create_tour
    @tour_stops = @tours.present? ? @tours.tour_stops : nil
    @tour_setting = @tours.tour_setting ||  @tours.create_tour_setting
    @community_opening_hours = @community.opening_hours.order(:sort).all


    @tour_elevator_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "elevator").map{|x| x.stop_id}

    @floorplates = @community.floorplates unless @community.is_sitemap
    @existing_stops = []


    @existing_path_points = []
    @building_list = []
    floor_choice = []
    building_choice = []

    @floor = nil
    
    
    # @floor_list = @community.floorplates.where(building: @building).map{|x| x.floors}.flatten!.sort rescue nil
    @floor_list = @community.floorplates.map{|x| x.floors}.flatten!.uniq.sort rescue nil
    params[:floorNo] = params[:floorNo].present? ? params[:floorNo] : @floor_list.first rescue nil
    #########################################################################
    # @tour_stops.where.not(stop_type: "elevator").map{|x| @building_list << x.stop_type.classify.constantize.find_by_id(x.stop_id).building}
    @building_list = @community.units.map{|x| x.building rescue next}.uniq.compact + @community.amenities.map{|x| x.building rescue next}.uniq.compact

    @building_list = @building_list.compact.reject { |c| c.empty? }.uniq
    @building_list = @building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(@building_list).sort.map{|x,y| y}
    
    @building = params[:building].present? ? params[:building] : @building_list[0]
    ########################################################################
    
    unless params[:floorNo].present?
      params[:floorNo] = @community.floorplates.map{|f| f.floors}.flatten.sort[0].to_s
    end
    building_choice = @building == @building_list[0] ? ['',nil,@building] : [@building]
    
    if params[:floorNo].present? && !@community.is_sitemap
      
    floor_choice = (params[:floorNo].to_i == @floor_list[0]) ? [nil,params[:floorNo].to_i] : [params[:floorNo].to_i]
      @floor = params[:floorNo]
      @sitemap =  @community.floorplates.select{|f| f.floors.include?(params[:floorNo].to_i)}.first
      if @community.show_map
        
        @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id} & @sitemap.amenities.where(floor: floor_choice, building: building_choice).map{|x| x.id}
      else
        @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id} & @community.amenities.where(floor: floor_choice,building: building_choice).map{|x| x.id}
      end

      if @community.show_map
        
        @tour_unit_array =  @community.mdu ? TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}  & @sitemap.units.map{|x| x.id if (floor_choice.include? x.floor)  && (building_choice.include? x.building ) } | @community.units.where( floor: floor_choice,building: building_choice,modal_unit:  true).ids : []
      else
        @tour_unit_array =  @community.mdu ? TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}  & @community.units.map{|x| x.id if (floor_choice.include? x.floor) && (building_choice.include? x.building ) } | @community.units.where(floor: floor_choice,building: building_choice,modal_unit:  true).ids : []
      end

    else
      @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id}
      @tour_unit_array =  @community.mdu ? TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id} | @community.units.where( modal_unit: true).ids : []
      @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first
    end

    @building_starting_points = @community.building_starting_point.where( floor: @floor.to_i)
    @all_stops = @tour_amenity_array | @tour_unit_array | @community.elevators | @building_starting_points.map{|x| x.id}
    floorplate_units = []
    floorplate_units = TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}  & @sitemap.units.where.not(floor: @floor.to_i).map{|x| x.id} if @floor.present?
    # @community.tour.tour_stops.order(:sort).each {|x| x.stop_type.classify.constantize.find_by_id(x.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') if z.path_points.present? } if (x.present? && @all_stops.include?(x.stop_id)) }
    # @community.tour.tour_stops.order(:sort).each {|x| x.stop_type.classify.constantize.find_by_id(x.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') if (z.path_points.present? &&  !floorplate_units.include?(z.map_path_from_id) && !z.map_path_from_id.nil? ) } if (x.present? && @all_stops.include?(x.stop_id)) }
    begin
      floorplate_elevators = TourStop.where(tour_id: @community.tour.id,stop_type: "elevator").map{|x| x.stop_id if   (Elevator.find_by(id: x.stop_id.to_i).floors.include?(@floor.to_i) and (building_choice.include? (Elevator.find_by(id: x.stop_id.to_i).building))  )}.compact
    rescue
      floorplate_elevators = nil
    end
    # f = floorplate_elevators.each{|z| Elevator.find(z).id}

    # floorplate_elevators.each{|z| Elevator.find(z).paths.each{|path| @existing_path_points << path.path_points.reorder('id ASC') if (@tour_unit_array.include?(path.map_path_from_id) || @tour_amenity_array.include?(path.map_path_from_id) ||  @tour_unit_array.include?(path.map_path_to_id) || floorplate_elevators.include?(path.map_path_from_id)) }}
    ele_ids = []
    @community.floorplates.map{|x|  ele_ids << x.id if x.floors.include?(1)}

    @community.tour.tour_stops.order(:sort).each do |stop|

      next if !@community.mdu && stop.stop_type == "unit"
      next if  !(@all_stops.include?(stop.id)) && !(floorplate_elevators.include?(stop.stop_id)) && !@community.is_sitemap rescue ''
      to_sp_path = Path.where(map_path_to_id: nil, map_path_from_id: stop.stop_id).first if (!@community.is_sitemap && (@floor.to_i == (@tours.starting_floor.present? ? @tours.starting_floor : @community.floorplates.map{|f| f.floors}.flatten.min.to_i)))
      if !@community.is_sitemap
        begin

        if (floor_choice.include?(@tours.starting_floor) && building_choice.include?(@tours.building))       
          @community.tour.tour_stops.where(stop_id: @all_stops).map{|x|           @existing_path_points <<           Path.find_by(map_path_from_id: nil, map_path_to_id: x.stop_id).path_points rescue next} 
          @community.tour.tour_stops.where(stop_id: @all_stops).map{|x|           @existing_path_points <<           Path.find_by(map_path_from_id: x.stop_id, map_path_to_id: nil).path_points rescue next}
        
        end
        rescue
          floorplate_elevators = nil
        end
        # from_sp_path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: nil).first if ( (@floor.to_i == (@tours.starting_floor.present? ? @tours.starting_floor : @community.floorplates.map{|f| f.floors}.flatten.min.to_i)))
      else
        from_sp_path = Path.where(map_path_to_id: stop.stop_id, map_path_from_id: nil).first
        @existing_path_points << from_sp_path.path_points.reorder('id ASC') if (from_sp_path.present?)
        @existing_path_points << to_sp_path.path_points.reorder('id ASC') if (to_sp_path.present?)
      end
      # @existing_path_points << from_sp_path.path_points.reorder('id ASC') if (from_sp_path.present?)
      # @existing_path_points << to_sp_path.path_points.reorder('id ASC') if (to_sp_path.present?)
    end
    
    @community.tour.tour_stops.where(stop_id: @all_stops).map{|x|           @existing_path_points <<            @community.tour.tour_stops.where(stop_id: @all_stops).map{|y| Path.find_by(map_path_from_id: x.stop_id, map_path_to_id: y.stop_id).path_points.reorder('id ASC') unless x == y rescue next}.compact                              }
    
    
    @all_stops


    # @existing_path_points << @tours.path_points.reorder('id ASC') if @tours.path.present?
    @existing_path_points.flatten!
    @existing_path_points
    @existing_stops << Unit.where(id: @tour_unit_array) if @community.mdu
    @existing_stops << Amenity.where(id: @tour_amenity_array)
    @existing_stops << Elevator.where(id: @tour_elevator_array)
    @existing_stops << BuildingStartingPoint.where(id: @building_starting_points)
    
    if @community.show_map
      
      @amenities = @community.is_sitemap ? @community.amenities : (@sitemap.amenities.present? ? @sitemap.amenities.where(floor: floor_choice,building: building_choice) : []) rescue []
    else
      am = []
      TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").each{|x| am << (Amenity.find_by_id x.stop_id)}
      @amenities = @community.amenities - am.compact
    end
    @elevators = @community.elevators
    if @community.show_map
      @units = @community.is_sitemap ? @community.units : (@sitemap.units.map{|x| x if x.floor == @floor.to_i && (building_choice.include? x.building )}).compact rescue []
    else
      un = []
      TourStop.where(tour_id: @community.tour.id,stop_type: "unit").each{|x| un << (Unit.find_by_id x.stop_id)}
      @units = @community.is_sitemap ? (@community.units - un.compact) : (@community.units.where(floor: @floor.to_i,building: building_choice) - un.compact)
    end
  

  end
  
  def point_json

    @community.tour.tour_stops.each do |x|
      
      if x.present?
        ua = x.stop_type.classify.constantize.find_by_id(x.stop_id)
        ua.paths.each do |z| 
          @existing_path_points << z.path_points.reorder('id ASC') if z.path_points.present?
        end
      end

    end 

  end

  def save_tour_settings
    @community = Community.find params[:community_id]
    @tours = @community.tour
  end
  def starting_point
    @community = Community.find params[:community_id]
    @tours = @community.tour
    @sitemap = @community.is_sitemap ? @community.sitemap : (@community.tour.starting_floor.present? ? @community.floorplates.select{|x| x if x.floors.include?(@community.tour.starting_floor.to_i)}.last : @community.floorplates.select{|f| f.floors.include?(@community.floorplates.map{|f| f.floors}.flatten.sort[0].to_i)}.first)
    @amenities = @community.amenities
    @floors =  @community.floorplates.map{|f| f.floors}.flatten.uniq.sort
    @building = @community.units.map{|x| x.building rescue next}.uniq.compact + @community.amenities.map{|x| x.building rescue next}.uniq.compact
    @building = @building.compact.reject { |c| c.empty? }.uniq.sort
    @tours.x_plot = @tours.x_plot - 3 unless @tours.x_plot == 0
    @tours.y_plot = @tours.y_plot - 3 unless @tours.y_plot == 0
  end
  def sort_stops

    if params[:sitemap] == "false"
      tour = Tour.find_by(community_id: params[:community_id])
      hash = {}
      ele_array = []
      stop_list = params['array']
      minus = []
      selected_elevator = false
      begin
      stop_list.each do |id|

        stop = TourStop.find id
        
        if stop.stop_type == "elevator"
          unless selected_elevator
            ele = Elevator.find stop.stop_id
             
            if (ele.building != params[:building]) && params[:building] != ''
              minus << stop.id.to_s
              next
            end
            max_floor = @community.floorplates.map{|x| x.floors}.flatten.max
            if ele.floors.max != params['floor'].to_i or max_floor == params['floor'].to_i 
              ele_array << stop.id.to_s
              params['array'] = params['array'] - [stop.id.to_s]
              selected_elevator = true
            else
              params['array'] = params['array'] - [stop.id.to_s]
            end
          else
            params['array'] = params['array'] - [stop.id.to_s]
          end
        end
      end
      rescue
      end
      
      params['array'] = (params['array'].present? ? params['array'] - minus : []) + ele_array unless params['array'] == [] and params['floor'].to_i < 1
      hash = tour.sort_hash.class == String ? JSON.parse(tour.sort_hash) : tour.sort_hash
      
      hash[params[:building] + "," + params[:floor].to_s] = params[:array]
      tour.sort_hash = hash
      tour.save
    end
  end
  def display_stop
    ts = TourStop.find params[:stop_id]
    ts.display_stop ? ts.display_stop = false : ts.display_stop = true
    ts.save
    render :json => {:display=> ts.display_stop, :status => "200"}
    # render json: {display: ts.display_stop}, status: 200
  end
  def save_starting_point

    @community = Community.find params[:community_id]
    @tours = @community.tour
    @tours.name = params[:name].present? ? params[:name] : ""
    @tours.latitude = params[:latitude].present? ? params[:latitude] : ""
    @tours.longitude = params[:longitude].present? ? params[:longitude] : ""
    @tours.starting_floor = params[:starting_floor].present? ? params[:starting_floor] : nil
    
    @tours.building = params[:building].present? ? params[:building] : nil
    if @tours.building.nil? && params[:building].present?
      flash[:error] = "Building can not be empty"
      redirect_to starting_point_community_tours_path(@community)
    else
      if @tours.save
        flash[:notice] = "Tour settings updated successfully."
        redirect_to starting_point_community_tours_path(@community)
      else
        flash[:error] = @tours.errors.full_messages.join(',')
        redirect_to starting_point_community_tours_path(@community)
      end
    end
    
  end
  def ajaxplotstartingpoint
    tour = Tour.find params[:tour_id]
    if tour.present?
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      tour.x_plot = params[:x_plot]
      tour.y_plot = params[:y_plot]
      tour.save(validate: false)
      PaperTrail::Version.create(item_type: "TourStopStartingPoint",item_id: tour.id,event: "update",whodunnit: current_user.id,community_id: tour.community_id, company_id: current_company.id,object: "name: '#{tour.name}' community_id: '#{tour.community_id}'") rescue nil

      render json: {tour: tour}, status: 200
    else
      render json: {}, status: 404
    end
  end
  def resetStartingPoint
    tour = Tour.find params[:id]

    @community = Community.find params[:community_id]
    if tour.present?
      #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
      tour.x_plot = 0
      tour.y_plot = 0
      tour.save(validate: false)
      PaperTrail::Version.create(item_type: "TourStopStartingPoint",item_id: tour.id,event: "create",whodunnit: current_user.id,community_id: tour.community_id, company_id: current_company.id,object: "name: '#{tour.name}' community_id: '#{tour.community_id}'") rescue nil

      redirect_to starting_point_community_tours_path(@community)
    end
  end
  def select_stops
    @community = Community.find params[:community_id]
    @floorplate = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @amenities = @community.amenities
    @units = @community.units
    @tour_stops = @community.tour.tour_stops

    @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id}
    @tour_unit_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}
  end
  def ajaxplottourstoppoint
    splitText = params[:tour_stop_id].split(':')
    tour_stop = splitText[0].to_i
    stop_type = splitText[1]
    # ts = TourStop.find_by(stop_type: stop_type, stop_id: tour_stop)
    # if ts.present?
    #   ts.latitude = params[:x_plot]
    #   ts.longitude = params[:y_plot]
    #   ts.save
    #   render json: {tour: ts}, status: 200
    # else
    if stop_type == "amenity"
      st = Amenity.find tour_stop
      st.floor = params[:floor].to_i unless @community.show_map
      st.save
      stName = st.name
    elsif stop_type == "elevator"
      st = Elevator.find tour_stop
      stName = st.name
    else
      st = Unit.find tour_stop
      stName = st.marketing_name
    end
    ts = TourStop.create(stop_type: stop_type, stop_id: tour_stop,latitude: st.x_plot,longitude: st.y_plot,tour_id: current_community.tour.id,name: stName)
    PaperTrail::Version.create(item_type: "TourStop",item_id: st.id,event: "create",whodunnit: current_user.id,community_id: current_community.id, company_id: current_company.id,object: "name: '#{stName}' community_id: '#{current_community.id}'")
    render json: {tour: ts,community: @community}, status: 200
    # end
    # tour_stop = Tour.find params[:tour_stop_id]
    # if tour.present?
    #   #unit.first.update_attributes(x_plot: params[:x_plot],y_plot: params[:y_plot],floorplate_id: params[:floorplate_id])
    #   tour.x_plot = params[:x_plot]
    #   tour.y_plot = params[:y_plot]
    #   tour.save(validate: false)
    #   render json: {tour: tour}, status: 200
    # else
    #   render json: {}, status: 404
    # end
  end
  def edit_amenity
    @community = Community.find params[:community_id]
    @amenity = Amenity.find params[:format]
  end

  def draw_map_line
    
    from_id = params["stop_ids"].first if params["stop_ids"].present?
    from_type = params["stop_types"].first if params["stop_types"].present?
    to_id = params["stop_ids"].second if params["stop_ids"].present?
    to_type = params["stop_types"].second if params["stop_types"].present?
    unless params[:map_path_for].present?
      amenity_or_unit = params[:stop_type]&.classify&.constantize&.find_by_id(params[:unit_or_amenity])
      path_name = amenity_or_unit.class.to_s == "Unit" ? amenity_or_unit.marketing_name : amenity_or_unit&.name
    else
      # binding.pry
      # for starting point
      amenity_or_unit = Tour.find_by_id(params[:unit_or_amenity])
    end
    # to_un = Unit.find_by_id(second)
    # to_am = Amenity.find_by_id(second)
    # to_el = Elevator.find_by_id(second)
    if from_type == "unit"
      unit_amenity_or_elevator_from = Unit.find_by_id(from_id)
    elsif from_type == "amenity"
      unit_amenity_or_elevator_from = Amenity.find_by_id(from_id)
    elsif from_type == "elevator"
      unit_amenity_or_elevator_from = Elevator.find_by_id(from_id)
    elsif from_type == "building_starting_point"
      unit_amenity_or_elevator_from = BuildingStartingPoint.find_by_id(from_id)
    end

    if to_type == "unit"
      unit_amenity_or_elevator_to = Unit.find_by_id(to_id)
    elsif to_type == "amenity"
      unit_amenity_or_elevator_to = Amenity.find_by_id(to_id)
    elsif to_type == "elevator"
      unit_amenity_or_elevator_to = Elevator.find_by_id(to_id)
    elsif to_type == "building_starting_point"
      unit_amenity_or_elevator_to = BuildingStartingPoint.find_by_id(to_id)
    end

    # unit_amenity_or_elevator_to = Unit.find_by_id(first) ? Unit.find_by_id(first) : Amenity.find_by_id(first) 
    # unit_amenity_or_elevator_from = Unit.find_by_id(second) ? Unit.find_by_id(second) : Amenity.find_by_id(second)
    path = Path.where(map_path_to_id: unit_amenity_or_elevator_to&.id, map_path_to_type: unit_amenity_or_elevator_to&.class&.to_s,
                      map_path_from_id: unit_amenity_or_elevator_from&.id, map_path_from_type: unit_amenity_or_elevator_from&.class&.to_s ).first
    if path.blank?
      path = Path.where(map_path_to_id: unit_amenity_or_elevator_from&.id, map_path_to_type: unit_amenity_or_elevator_from&.class&.to_s,
                        map_path_from_id: unit_amenity_or_elevator_to&.id, map_path_from_type: unit_amenity_or_elevator_to&.class&.to_s ).first
    end
    # binding.pry
    unless path.present?
      path = Path.create name: path_name
      path.update(map_path: amenity_or_unit, map_path_to: unit_amenity_or_elevator_to, map_path_from: unit_amenity_or_elevator_from)
      begin
        if path.map_path_type == "Unit"
          stop = Unit.find path.map_path_id
          stName = stop.marketing_name
        else
          stop = Amenity.find path.map_path_id
          stName = stop.name
        end
        PaperTrail::Version.create(item_type: "TourPath",item_id: stop.id,event: "create",whodunnit: current_user.id,community_id: stop.community_id, company_id: current_company.id,object: "name: '#{stName}' community_id: '#{stop.community_id}'")

      rescue => e
        puts "exception *************"

      end

    end
    render json: {path: path, path_points: path.path_points.reorder('id DESC')}, status: 200
  end
  def building_starting_point
    
    bsp = BuildingStartingPoint.create(community_id: @community.id,x_plot: 40,y_plot: 10, building: params[:building], floor: params[:floor].to_i, name: "Building " + params[:building] + " Entry / Exit")
    tour_stop = TourStop.create tour_id: @community.tour.id, stop_id: bsp.id, stop_type: 'building_starting_point', name: bsp.name, latitude: 40, longitude: 10 unless bsp.errors.present?
    # render json: {path: tour_stop}, status: 200
    
    flash[:error] = bsp.errors.full_messages.join(',') if bsp.errors.present?
    redirect_to community_tours_path(floorNo: params[:floor].to_i,building: params[:building])
  end
  def update_building_starting_point
    @building_starting_point = BuildingStartingPoint.find_by_id params[:bsp_id]
    @tour_stop = TourStop.find_by(stop_id: @building_starting_point, stop_type: "building_starting_point")
    respond_to do |format|
      if @building_starting_point.update_attributes(x_plot: params[:x_plot], y_plot: params[:y_plot]) && @tour_stop.update_attributes(latitude: params[:x_plot], longitude: params[:y_plot])
        format.json { render json: @building_starting_point, status: :ok }
      else
        format.json { render json: @building_starting_point.errors, status: :unprocessable_entity }
      end
    end
  
  end
  def select_status
    
    @building = params[:building]
    @floor = params[:floor]
    redirect_to building_starting_point_community_tours_path(building: @building,floor: @floor,status: params[:status]) if params[:status].present?
  end
  def add_elevator
    last_elev = Elevator.last if Elevator.count > 0

    last_elevator_id = last_elev.present? ? last_elev.id : 0
    elevators = TourStop.where(tour_id: @community.tour.id,stop_type: "elevator")
    elev_name = "Elevator #{elevators.present? ? elevators.length + 1 : 1}"
    elev_desc = "Elevator #{elevators.present? ? elevators.length + 1 : 1}"
    
    
    @floorplate = Floorplate.find params[:floorplate] if params[:floorplate].present?
    floors = @community.floorplates.map{|x| x.floors}.flatten
    floorplate_range = @floorplate.present? ? (@floorplate.range.include?("-") ? @floorplate.floors.min.to_s + "-" + (@floorplate.floors.max.to_i + 1).to_s : (@floorplate.range.to_s + "-" + (@floorplate.range.to_i + 1).to_s).to_s )  : "-"
    floorplate_range = floors.min.to_s + '-' + floors.max.to_s
    elevator = Elevator.create(name: elev_name, description: elev_desc, x_plot: 10, y_plot: 40, floorplate_covering_range: floorplate_range, image: File.open("app/assets/images/elev2.png"),floorplate_id: @floorplate.present? ? @floorplate.id : nil, building: params[:building],community_id: @community.id)
    tour_stop = TourStop.create tour_id: params[:tour_id], stop_id: elevator.id, stop_type: 'elevator', name: elevator.name
    render json: {path: tour_stop}, status: 200
  end

  def update_elevator
    elevator = Elevator.find_by_id(params[:elevator_id])
    if elevator.present?
      elevator.update_attributes x_plot: params[:x_plot], y_plot: params[:y_plot]
      status = 200
      message = 'updated successfully'
    else
      status = 201
      message = 'update failed'
    end
    ts = TourStop.find_by(stop_id: elevator.id)
    if ts.present?
      ts.latitude  = elevator.x_plot
      ts.longitude = elevator.y_plot
      ts.save
    end
    render json: {message: message}, status: status
  end

  def point_save
    path_point = PathPoint.create x_plot: params[:x_plot], y_plot: params[:y_plot], path_id: params[:path_id]
    begin
    path = (Path.find params[:path_id])
    if path.map_path_to_type == "Unit"
      stop =  Unit.find(path.map_path_id).id
    elsif path.map_path_to_type == "Amenity"
      stop =  Amenity.find(path.map_path_id).id
    elsif path.map_path_to_type == "Elevator"
      stop =  Elevator.find(path.map_path_id).id
    elsif path.map_path_to_type == "BuildingStartingPoint"
      stop =  BuildingStartingPoint.find(path.map_path_id).id
    else
      stop = path.map_path_to_id.present? ? TourStop.find_by_stop_id(path.map_path_to_id).tour.id : TourStop.find_by_stop_id(path.map_path_from_id).tour.id
    end

    if path.map_path_from_type == "Unit"
      start =  Unit.find(path.map_path_from_id).id
    elsif path.map_path_from_type == "Amenity"
      start =  Amenity.find(path.map_path_from_id).id
    elsif path.map_path_from_type == "Elevator"
      start =  Elevator.find(path.map_path_from_id).id
    elsif path.map_path_from_type == "BuildingStartingPoint"
      start =  BuildingStartingPoint.find(path.map_path_from_id).id
    else
      start = path.map_path_to_id.present? ? TourStop.find_by_stop_id(path.map_path_to_id).tour.id : TourStop.find_by_stop_id(path.map_path_from_id).tour.id
    end

    PaperTrail::Version.create(item_type: "PathPoint",item_id: path.id,event: "create",whodunnit: current_user.id,community_id: path.community_id, company_id: current_company.id,object: "name: '#{path.is_a?(Unit) ? path.marketing_name : path.name}' community_id: '#{path.community_id}'")
    rescue => e
      puts "exception *************"
    end
    NeighbourUnit.create path_point: path_point, unit_id: params[:unit_ids].join(',') if params[:unit_ids].present?
    render json: {point: path_point, line_start_point: start, line_stop_point: stop,exist: path.path_points.count > 1, last_point: path.path_points.sort[path.path_points.count - 2]}, status: 200
  end

  def point_update

    path_point = PathPoint.find(params[:point_id])
    path_point.update_attributes(x_plot: params[:x_plot], y_plot: params[:y_plot])
    path_point.neighbour_units.destroy_all
    NeighbourUnit.create path_point: path_point, unit_id: params[:unit_ids].join(',') if params[:unit_ids].present?
    begin
    pp = PathPoint.find path_point.id
    stop = (Path.find pp.path_id)
    if stop.map_path_type == "Unit"
      stop =  Unit.find stop.map_path_id
    else
      stop =  Amenity.find stop.map_path_id
    end
    PaperTrail::Version.create(item_type: "PathPoint",item_id: stop.id,event: "update",whodunnit: current_user.id,community_id: stop.community_id, company_id: current_company.id,object: "name: '#{stop.is_a?(Unit) ? stop.marketing_name : stop.name}' community_id: '#{stop.community_id}'")
    rescue => e
      puts "exception *************"
    end
    render json: {point: path_point}, status: 200
  end

  def point_delete
    path_point = PathPoint.find(params[:point_id])
    begin
      pp = PathPoint.find path_point.id
      stop = (Path.find pp.path_id)
      if stop.map_path_type == "Unit"
        stop =  Unit.find stop.map_path_id
      else
        stop =  Amenity.find stop.map_path_id
      end
      PaperTrail::Version.create(item_type: "PathPoint",item_id: stop.id,event: "delete",whodunnit: current_user.id,community_id: stop.community_id, company_id: current_company.id,object: "name: '#{stop.is_a?(Unit) ? stop.marketing_name : stop.name}' community_id: '#{stop.community_id}'")
    rescue => e
      puts "exception *************"
    end
    if path_point.present?
      path_point.destroy
      if !path_point.path.path_points.present?
        # path_point.path.destroy
      end
    end
    render json: {point: path_point.present? ? path_point : {}, point_id: "point_#{params[:point_id]}"}, status: 200
  end

  def delete_path_on_sort_change
    tour_stop = TourStop.find(params[:tour_stop_id])
    status = "failed"
    if tour_stop.present?
      # binding.pry
      path = tour_stop.stop_type.classify.constantize.find(tour_stop.stop_id).paths.last
      if path.present?
        path.destroy
        status = "successfully destroyed"
      else
        status = "failed"
      end
    end
    render json: {tour_stop: tour_stop.present? ? tour_stop : {}}, status: 200, message: status
  end

  def id_selfie_matching
    @visitor = TourUser.find_by_id(params[:tour_user_id])
    @community = Community.find_by_id (params[:community])
    # binding.pry
    puts "<<<<<<<<<<< ID MISMATCH? #{@visitor.id_selfie_mismatch} >>>>>>>>>>"
    render  'visitor_profile'
  end
  def test_automate
    AutomateUnitStop.perform_async current_community if current_community.automate_unit_stop
    redirect_to community_tours_path(current_community)
  end

  def flag_id_mismatch
    if params[:tour_user_id].present?
      tour_user = TourUser.find_by_id params[:tour_user_id]
      tour_user.update_attributes id_selfie_mismatch: params[:match_status]
      community = Community.find_by_id params[:community]
      community_email =  community.email
      status = 200
      message = "ID/Selfie is marked #{params[:match_status] == "true" ? 'Mismatched' : 'Matched' }"

      if tour_user.id_selfie_mismatch
        name = tour_user.name || tour_user.email.split('@').first.humanize

        email_content = "The user has a mismatching ID/Selfie. <br/> <a href='#{manual_selfie_match_url tour_user.id }?community=#{community.id}' target='_blank'> Visitor's ID page </a>"
        DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'usman.khalid@intagleo.co.uk')
        if community_email.present?
          DelayedSchedulerMailerJob.perform_async("User #{name} is marked Mismatched ", email_content, community_email)
        else
          DelayedSchedulerMailerJob.perform_async("User #{name} is marked Mismatched ", email_content, 'jennifer@pynwheel.com') unless params[:local_testing].present?
        end
      end
    else
      status = 404
    end
    # binding.pry
    render json: { message: message, status: status }
  end

  def save_opening_hours

    if params[:community_id].present?
      OpeningHour.where(community_id: params[:community_id]).delete_all
      
      i=1
      day_key = 'day_' + i.to_s
      from_key = 'from_' + i.to_s
      to_key = 'to_' + i.to_s

      while params[day_key].present?
        times = current_community.opening_hours.create(day: params[day_key], opening_time: params[from_key], closing_time: params[to_key])

        i=i+1
        day_key = 'day_' + i.to_s
        from_key = 'from_' + i.to_s
        to_key = 'to_' + i.to_s
      end
    end
    @community = Community.find params[:community_id]
    redirect_to community_tours_path(@community)
    flash[:notice] = "Tour settings updated successfully."
  end

  def get_id_selfie_mismatch
    if params[:tour_user_id].present?
      tour_user = TourUser.find_by_id params[:tour_user_id]
      status = 200
      message = "User is found"
    else
      status = 404
      message = "Please provide tour user id"
    end

    render json: {match_status: tour_user.id_selfie_mismatch ||= nil, message: message, status: status }
  end
end
