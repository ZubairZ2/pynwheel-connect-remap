class ToursController < ApplicationController
  def index
    begin
    @community = Community.find params[:community_id]
    @tours = @community.tour || @community.create_tour
    @tour_stops = @tours.present? ? @tours.tour_stops : nil

    @amenities = @community.amenities
    @elevators = @community.elevators

    @units = @community.units

    # you might sometime later wonder that why this is being done like separate arrays
    # I myself did using %w(amenity unit elevator) BUT those arrays are being used in views.
    # Watchout
    @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id}
    @tour_unit_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}

    @tour_elevator_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "elevator").map{|x| x.stop_id}
    
    @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @existing_stops = []
    @existing_stops << Unit.where(id: @tour_unit_array)
    @existing_stops << Amenity.where(id: @tour_amenity_array)
    @existing_stops << Elevator.where(id: @tour_elevator_array)

    @existing_path_points = []
    # binding.pry
    @community.tour.tour_stops.order(:sort).each {|x| x.stop_type.classify.constantize.find_by_id(x.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') if z.path_points.present? } if x.present? }
    

    @existing_path_points << @tours.path_points.reorder('id ASC') if @tours.path.present?
    @existing_path_points.flatten!
    # binding.pry
    @existing_path_points
    rescue => ex
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
    @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @amenities = @community.amenities
    @tours.x_plot = @tours.x_plot - 3 unless @tours.x_plot == 0
    @tours.y_plot = @tours.y_plot - 3 unless @tours.y_plot == 0
  end
  def save_starting_point

    @community = Community.find params[:community_id]
    @tours = @community.tour
    @tours.name = params[:name].present? ? params[:name] : ""
    @tours.latitude = params[:latitude].present? ? params[:latitude] : ""
    @tours.longitude = params[:longitude].present? ? params[:longitude] : ""
    if @tours.save
      flash[:notice] = "Tour settings updated successfully."
      redirect_to starting_point_community_tours_path(@community)
    else
      flash[:error] = @tours.errors.full_messages.join(',')
      redirect_to starting_point_community_tours_path(@community)
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
    unless params[:map_path_for].present?
      amenity_or_unit = params[:stop_type].classify.constantize.find_by_id(params[:unit_or_amenity])
      path_name = amenity_or_unit.class.to_s == "Unit" ? amenity_or_unit.marketing_name : amenity_or_unit.name
    else
      # for starting point
      amenity_or_unit = Tour.find_by_id(params[:unit_or_amenity])
    end

    path = Path.where(map_path_id: amenity_or_unit.id, map_path_type: amenity_or_unit.class.to_s).first
    unless path.present?
      path = Path.create name: path_name
      path.update_attribute(:map_path, amenity_or_unit)
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

    render json: {path: path}, status: 200
  end

  def point_save

    path_point = PathPoint.create x_plot: params[:x_plot], y_plot: params[:y_plot], path_id: params[:path_id]
    begin
    stop = (Path.find params[:path_id])
    if stop.map_path_type == "Unit"
      stop =  Unit.find stop.map_path_id
    else
      stop =  Amenity.find stop.map_path_id
    end
    PaperTrail::Version.create(item_type: "PathPoint",item_id: stop.id,event: "create",whodunnit: current_user.id,community_id: stop.community_id, company_id: current_company.id,object: "name: '#{stop.is_a?(Unit) ? stop.marketing_name : stop.name}' community_id: '#{stop.community_id}'")
    rescue => e
      puts "exception *************"
    end
    NeighbourUnit.create path_point: path_point, unit_id: params[:unit_ids].join(',') if params[:unit_ids].present?
    render json: {point: path_point}, status: 200
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
    # binding.pry
    puts "<<<<<<<<<<< ID MISMATCH? #{@visitor.id_selfie_mismatch} >>>>>>>>>>"
    render  'visitor_profile'
  end

  def flag_id_mismatch
    if params[:tour_user_id].present?
      tour_user = TourUser.find_by_id params[:tour_user_id]
      tour_user.update_attributes id_selfie_mismatch: params[:match_status]
      status = 200
      message = "ID/Selfie is marked #{params[:match_status] == "true" ? 'Mismatched' : 'Matched' }"

      if tour_user.id_selfie_mismatch
        name = tour_user.name || tour_user.email.split('@').first.humanize

        email_content = "The user has a mismatching ID/Selfie. <br/> <a href='#{manual_selfie_match_url tour_user.id }' target='_blank'> Visitor's ID page </a>"

        DelayedSchedulerMailerJob.perform_async("User #{name} is marked Mismatched ", email_content, 'jennifer@pynwheel.com') unless params[:local_testing].present?
        DelayedSchedulerMailerJob.perform_async("ID / Selfie Matching (Manual)", email_content, 'usman.khalid@intagleo.co.uk')
        DelayedSchedulerMailerJob.perform_async("User #{name} is marked Mismatched ", email_content, 'arslan.mirza@intagleo.com')

      end
    else
      status = 404
    end
    # binding.pry
    render json: { message: message, status: status }
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
