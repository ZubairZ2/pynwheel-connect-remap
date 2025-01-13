class TourUsersController < ApplicationController
  # include Error::ErrorHandler
  before_action :check_community
  before_action :breadCrumb
  before_action :load_community, only: [:reset_tour_stops]
  before_action :load_tour_user, only: [:reset_tour_stops]

  skip_before_action :load_tour_users_chats, only: [:lock_ploting]

  def index
    add_breadcrumb "All Visitors", '#'
    @community = Community.find params[:community_id]
    tour_ids = CustomizeTourService.new(@community, nil).get_community_tours_ids
    user_ids = TourHistory.where(tour_id: tour_ids).pluck(:tour_user_id).uniq if @community.present? && @community.community_tour.present?
    @tour_users = user_ids.present? ? TourUser.where(id: user_ids) : []
  end
  
  def show
    @community = Community.find params[:community_id]
    add_breadcrumb "All Visitors", community_tour_users_path(@community)
    add_breadcrumb "Visitor Details", "#"
    @tour_user = TourUser.find params[:id]
    @virtual_list = []
    @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
    @tour = @community.community_tour unless @tour.present?
    @visited_stop = VisitedStop.where(tour_id: [@tour.id, @community.community_tour.id], tour_user_id: @tour_user.id).group_by(&:tour_stop_id)
    @alerts = TourHistory.where(tour_user_id: @tour_user.id, tour_id: [@tour.id, @community.community_tour.id])
    chatroom = Chatroom.find_by(tour_user_id: params[:id], tour_id: @community.community_tour.id)
    @chatroom_id = chatroom.present? ? chatroom.id : 0
    
    if current_user.is_view_visitor_details_page? && @tour_user.email != current_user.email
      redirect_to root_path
    end

    # ------------ locks ploting on the map ---------------- #

    if @community.dwelo.present?
      @visited_amenities_history = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts&.last&.id, stop_type: "amenity", event: "unlocked_event")
      @visited_units_history = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts&.last&.id, stop_type: "unit", event: "app_unlock")

      @visited_amenities_history = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts&.last&.id, stop_type: "amenity", event: "app_unlock")
    else
      @visited_units_history = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts&.last&.id, stop_type: "unit", event: "unlocked_event")
      @visited_amenities_history = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts&.last&.id, stop_type: "amenity", event: "unlocked_event")
    end

    unit_ids = @visited_units_history.map{|x| x.stop_id}.uniq
    amenity_ids = @visited_amenities_history.map{|x| x.stop_id}.uniq

    unless @community.is_sitemap
      units = @community.floorplates.all.order("id ASC").first.units.where(id: unit_ids)
      amenities = @community.floorplates.all.order("id ASC").first.amenities.where(id: amenity_ids)

      @visited_units_history = @visited_units_history.where(stop_id: units.ids)
      @visited_amenities_history = @visited_amenities_history.where(stop_id: amenities.ids)
    else
      units = @community.units.where(id: unit_ids)
      amenities = @community.amenities.where(id: amenity_ids)
    end

    @existing_stops = []
    @existing_stops << units if units.present?
    @existing_stops << amenities if amenities.present?

    if @community.is_sitemap
      @sitemap = @community.sitemap

    else
      min_floor = @community.floorplates.map{|x| x.floors}.flatten.min
      @sitemap = @community.floorplates.map{|x| x if x.floors.include?(min_floor)}.compact.first
    end
 end

  def lock_ploting
    community_id = params[:community_id]
    tour_user_id = params[:tour_user_id]
    tour_history_id = params[:tour_history_id]
    floorplate_id = params[:floorplate_id]

    community = Community.find community_id
    if params[:dwelo_id] == "present"
      visited_amenities_history = LockHistory.where(tour_user_id: tour_user_id, tour_history_id: tour_history_id, stop_type: "amenity", event: "app_unlock")
      visited_units_history = LockHistory.where(tour_user_id: tour_user_id, tour_history_id: tour_history_id, stop_type: "unit", event: "app_unlock")
      unit_ids = visited_units_history.map{|x| x.stop_id}.uniq
      amenity_ids = visited_amenities_history.map{|x| x.stop_id}.uniq

      unless community.is_sitemap
        units = (Floorplate.find floorplate_id).units.where(id: unit_ids)
        amenities = (Floorplate.find floorplate_id).amenities.where(id: amenity_ids)

        visited_units_history = visited_units_history.where(stop_id: units.ids)
        visited_amenities_history = visited_amenities_history.where(stop_id: amenities.ids)
      else
        units = community.units.where(id: unit_ids)
        amenities = community.amenities.where(id: amenity_ids)
      end

      existing_stops = []
      existing_stops << units if units.present?
      existing_stops << amenities if amenities.present?

      lock_histories = []
      lock_histories << visited_units_history if visited_units_history.present?
      lock_histories << visited_amenities_history if visited_amenities_history.present?

      render json: {existing_stops: existing_stops, lock_histories: lock_histories}, status: 200
    
    else
      visited_units_history = LockHistory.where(tour_user_id: tour_user_id, tour_history_id: tour_history_id, stop_type: "unit", event: "unlocked_event")
      visited_amenities_history = LockHistory.where(tour_user_id: tour_user_id, tour_history_id: tour_history_id, stop_type: "amenity", event: "unlocked_event")
      unit_ids = visited_units_history.map{|x| x.stop_id}.uniq
      amenity_ids = visited_amenities_history.map{|x| x.stop_id}.uniq

      unless community.is_sitemap
        units = (Floorplate.find floorplate_id).units.where(id: unit_ids)
        amenities = (Floorplate.find floorplate_id).amenities.where(id: amenity_ids)

        visited_units_history = visited_units_history.where(stop_id: units.ids)
        visited_amenities_history = visited_amenities_history.where(stop_id: amenities.ids)
      else
        units = community.units.where(id: unit_ids)
        amenities = community.amenities.where(id: amenity_ids)
      end

      existing_stops = []
      existing_stops << units if units.present?
      existing_stops << amenities if amenities.present?

      lock_histories = []
      lock_histories << visited_units_history if visited_units_history.present?
      lock_histories << visited_amenities_history if visited_amenities_history.present?

      render json: {existing_stops: existing_stops, lock_histories: lock_histories}, status: 200
    end
  end

  def visited_stops_data
    if(params[:tour_history_id].present?)
      tour_history = TourHistory.find params[:tour_history_id]
      floors = []
      buildings = []
      stops = []
      visitod_stops = VisitedStop.where(tour_key: tour_history.tour_key).order(:id)
      tour = Tour.find tour_history.tour_id

      visitod_stops.each_with_index do |x, index|
        points = []
        tour_stop = TourStop.find_by_id x.tour_stop_id if x.tour_stop_id.present?

        if tour_stop.present? && tour_stop.stop_id.present?
          v_s = tour_stop.stop_type.classify.constantize.find_by_id tour_stop.stop_id
          
          if v_s.present?
            # For Tour Starting Point             
            if index === 0 
              points << {x_plot: tour.x_plot, y_plot: tour.y_plot}
              points = inserTourPoints(tour_stop, points)

              stops << ['', tour, 'tour', points]
              points = []
            end
            
            current_stop = TourStop.find_by_id visitod_stops[index+1].tour_stop_id if visitod_stops[index+1].present? && visitod_stops[index+1].tour_stop_id.present?
            prev_stop = tour_stop
            
            if current_stop.present? && prev_stop.present?
              points << {x_plot: v_s.x_plot, y_plot: v_s.y_plot}
              points = insertMiddlePoints(current_stop, prev_stop, points)
            end
      
            stops << [x, v_s, tour_stop.stop_type, points]
            points = []
          end 
        end
      end

      if @community.is_sitemap
        floor_image = @community.floorplates.map{|x| [x.floors,x.image.url]}
        floors = buildings = nil

      else
        floor_image = @community.floorplates.map{|x| [x.floors,x.image.url]}
        stops.each do |f|
          if f[2].present? && (f[2] == "unit" || f[2] == "amenity")
            if f.present? && f[1].present?
              if f[1].floor.present?
                floors << f[1].floor
              end

              if f[1].building.present?
                buildings <<  f[1].building
              else
                f[1].building = "A"
                buildings << "A" #If no building Add building A for test
              end
            end
          end
        end

        floors = floors.compact.uniq.sort
        buildings = buildings.compact.uniq
      end

      render json: {:stops => stops, :floors => floors, :buildings => buildings, :floor_image => floor_image, :lock_access_time => (tour_history.lock_access_time.strftime("%I:%M %p") rescue ""), :left => tour_history.left}, status: 200
    else
      render json: {}, status: 404
    end
  end

  def insertMiddlePoints(current_stop, previous_stop, points = [])
    path = Path.where(map_path_to_id: current_stop.stop_id, map_path_from_id: previous_stop.stop_id).first

    if path.blank?
      path = Path.where(map_path_to_id: previous_stop.stop_id, map_path_from_id: current_stop.stop_id).first

      if path.present? && path.path_points.present?
        path.path_points.reorder('id DESC').each do |p|
          points << {x_plot: p.x_plot, y_plot: p.y_plot}
        end
      end
    else
      if path.present? && path.path_points.present?
        path.path_points.reorder('id ASC').each do |p|
          points << {x_plot: p.x_plot, y_plot: p.y_plot}
        end
      end
    end

    points
  end

  def inserTourPoints(tour_stop, points = [])
    path = Path.where(map_path_to_id: tour_stop.stop_id, map_path_from_id: nil).first

    if path.blank?
      path = Path.where(map_path_to_id: nil, map_path_from_id: tour_stop.stop_id).first
      if path.present? && path.path_points.present?
        path.path_points.reorder('id DESC').each do |p|
          points << {x_plot: p.x_plot, y_plot: p.y_plot}
        end
      end
    else
      if path.present? && path.path_points.present?
        path.path_points.reorder('id ASC').each do |p|
          points << {x_plot: p.x_plot, y_plot: p.y_plot}
        end
      end
    end

    points
  end

  def destroy
    @community = Community.find params[:community_id]
    @tour_user = TourUser.find params[:id]
    @tour =  @community.community_tour
    tour_ids =  CustomizeTourService.new(@community, @tour_user).get_community_tours_ids
    record_ids = [tour_ids, @tour.id].flatten
    if params[:delete_all].present?
      delete_tour_user_all_attributes(@tour_user, @community)
      redirect_to community_tour_users_path(@community), :notice => "User data deleted successfully"
    
    elsif  params[:image].present? or params[:name].present? or params[:email].present? or params[:phone_number].present? or params[:history].present? or params[:authentiq_verified_at].present? or params[:checkpoint_verified_at].present?
      update_tour_user_attributes(@tour_user, @community)
      
      if params[:authentiq_verified_at].present? or params[:checkpoint_verified_at].present?
        redirect_to community_tour_users_path(@community), :notice => "Id verification has been reset"
      else
        redirect_to community_tour_users_path(@community), :notice => "User data deleted successfully"
      end

    else
      tour_histories = TourHistory.where(tour_user_id: @tour_user.id, tour_id: record_ids).includes(:lock_histories)
      lock_histories_ids = tour_histories.all.map { |x| x.lock_histories.ids }.flatten
      LockHistory.where(id: lock_histories_ids).delete_all

      if @tour_user.chatrooms.find_by(tour_id: @tour.id).present?
        @tour_user.chatrooms.find_by(tour_id: @tour.id).chats.delete_all
        @tour_user.chatrooms.find_by(tour_id: @tour.id).delete
      end

      @tour_user.as_guests.find_by(community_id: @community.id).delete if @tour_user.as_guests.find_by(community_id: @community.id).present?
      @tour_user.igloo_guests.where(community_id: @community.id).delete_all if @tour_user.igloo_guests.find_by(community_id: @community.id).present?
      @tour_user.tour_histories.where(tour_id: record_ids).delete_all
      @tour_user.visited_stops.where(tour_id: record_ids).delete_all
      @tour_user.schedual_tours.where(community_id: @community.id).delete_all
      @tour_user.prospects.where(community_id: @community.id).delete_all

      redirect_to community_tour_users_path(@community), :notice => "User deleted successfully"
    end
  end

  def delete_tour_user_all_attributes(tour_user, community)
    tour_user.email = "Removed at Consumer Request"
    tour_user.first_name = "Removed at Consumer Request"
    tour_user.last_name = ""
    tour_user.name = ""
    tour_user.phone_number = "Removed at Consumer Request"

    if tour_user.image.present?
      tour_user.remove_image!
      tour_user.image = File.open("app/assets/images/default-user128x128.jpg")
    end

    if tour_user.id_card.present?
    tour_user.remove_id_card!
    tour_user.id_card = File.open("app/assets/images/default id card.jpg")
    end

    tour_user.save!(validate: false)

    tour_ids =  CustomizeTourService.new(community, tour_user).get_community_tours_ids
    tour_histories = TourHistory.where(tour_user_id: tour_user.id, tour_id: tour_ids) rescue nil
    
    if tour_histories.present?
      tour_histories.each do |tour_history|
        tour_history.history = true
        tour_history.save!
      end
    end
  end

  def update_tour_user_attributes(tour_user, community)
    if params[:email] == "true"
      tour_user.email = "Removed at Consumer Request"
      tour_user.save!(validate: false)
    end

    if params[:name] == "true"
      tour_user.name = "Removed at Consumer Request"
      tour_user.first_name =  "Removed at Consumer Request"
      tour_user.last_name = ""
      tour_user.save!(validate: false)
    end

    if params[:phone_number] == "true"
      tour_user.phone_number = "Removed at Consumer Request"
      tour_user.save!(validate: false)
    end

    if params[:image] == "true"
      tour_user.remove_image!
      tour_user.remove_id_card!
      tour_user.id_card = File.open("app/assets/images/default id card.jpg")
      tour_user.image = File.open("app/assets/images/default-user128x128.jpg")
      tour_user.save!(validate: false)
    end

    if params[:history] == "true"
      tour_ids =  CustomizeTourService.new(community, tour_user).get_community_tours_ids
      tour_histories = TourHistory.where(tour_user_id: tour_user.id, tour_id: tour_ids) rescue nil
      tour_histories.each do |tour_history|
        tour_history.history = true
        tour_history.save!
      end
    end
    
    if params[:authentiq_verified_at] == "true"
      tour_user.update(authentiq_verified_at: nil, is_authentiq_verified: false) if community.community_tour.verification_type == "authenteq"
    end

    if params[:checkpoint_verified_at] == "true"
      tour_user.update(checkpoint_verified_at: nil, is_checkpoint_verified: false) if community.community_tour.verification_type == "check_point_id"
    end
  end

  def breadCrumb
    add_breadcrumb "Home", root_path
  end

  def reset_tour_stops
    if @community.present? && @tour_user.present?
      response = CustomizeTourService.new(@community, @tour_user).reset_user_tour_stops
      redirect_to community_tour_users_path(@community), notice: 'User tour stops reset successfully'
    else
      redirect_to community_tour_users_path(@community), notice: 'Community or tour user not fount'
    end
  end

  private

  def load_community
    @community ||= Community.find_by_id params[:community_id]
  end

  def load_tour_user
    @tour_user ||= TourUser.find_by_id params[:tour_user_id]
  end

end
