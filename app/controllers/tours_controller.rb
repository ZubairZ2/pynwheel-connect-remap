class ToursController < ApplicationController
  def index
    begin
    @community = Community.find params[:community_id]
    @tours = @community.tour || @community.create_tour
    @tour_stops = @tours.present? ? @tours.tour_stops : nil

    @amenities = @community.amenities
    @units = @community.units
    @tour_amenity_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "amenity").map{|x| x.stop_id}
    @tour_unit_array =  TourStop.where(tour_id: @community.tour.id,stop_type: "unit").map{|x| x.stop_id}
    
    @sitemap = @community.is_sitemap ? @community.sitemap : @community.floorplates.first
    @existing_stops = []
    @existing_stops << Unit.where(id: @tour_unit_array)
    @existing_stops << Amenity.where(id: @tour_amenity_array)

    @existing_path_points = []
    
    @community.tour.tour_stops.each {|x| x.stop_type.classify.constantize.find_by_id(x.stop_id).paths.each{|z| @existing_path_points << z.path_points.reorder('id ASC') if z.path_points.present? } if x.present? }
    

    @existing_path_points << @tours.path_points if @tours.path.present?
    @existing_path_points.flatten!
    rescue => ex
    end
    # binding.pry
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
    else
      st = Unit.find tour_stop
      stName = st.marketing_name
    end
    ts = TourStop.create(stop_type: stop_type, stop_id: tour_stop,latitude: st.x_plot,longitude: st.y_plot,tour_id: current_community.tour.id,name: stName)
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
      amenity_or_unit = Amenity.find_by_id(params[:unit_or_amenity]) || Unit.find_by_id(params[:unit_or_amenity])
      path_name = amenity_or_unit.class.to_s == "Unit" ? amenity_or_unit.marketing_name : amenity_or_unit.name
    else
      # for starting point
      amenity_or_unit = Tour.find_by_id(params[:unit_or_amenity])
    end

    path = Path.where(map_path_id: amenity_or_unit.id, map_path_type: amenity_or_unit.class.to_s).first
    unless path.present?
      path = Path.create name: path_name
      path.update_attribute(:map_path, amenity_or_unit)
    end

    render json: {path: path}, status: 200
  end

  def point_save
    path_point = PathPoint.create x_plot: params[:x_plot], y_plot: params[:y_plot], path_id: params[:path_id]
    
    NeighbourUnit.create path_point: path_point, unit_id: params[:unit_ids].join(',') if params[:unit_ids].present?
    render json: {point: path_point}, status: 200
  end

  def point_update
    path_point = PathPoint.find(params[:point_id])
    path_point.update_attributes(x_plot: params[:x_plot], y_plot: params[:y_plot])
    path_point.neighbour_units.destroy_all
    NeighbourUnit.create path_point: path_point, unit_id: params[:unit_ids].join(',') if params[:unit_ids].present?
    render json: {point: path_point}, status: 200
  end

  def point_delete
    path_point = PathPoint.find(params[:point_id])
    if path_point.present?
      path_point.destroy
    end
    render json: {point: path_point.present? ? path_point : {}, point_id: "point_#{params[:point_id]}"}, status: 200
  end
end
