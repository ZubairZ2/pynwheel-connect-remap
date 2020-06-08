class TourUsersController < ApplicationController
  before_action :check_community
  before_action :breadCrumb
  skip_before_action :load_tour_users_chats, only: [:lock_ploting]

  def index
    add_breadcrumb "All Visitors", '#'
    @community = Community.find params[:community_id]
    user_ids = TourHistory.where(tour_id: @community.tour.present? ? @community.tour.id : nil).order('arrived desc').map{|x| x.tour_user_id}.uniq
    @tour_users = []
    user_ids.each {|x| @tour_users << TourUser.find_by_id(x)}
  end
  def show
    @community = Community.find params[:community_id]
    add_breadcrumb "All Visitors", community_tour_users_path(@community)
    add_breadcrumb "Visitor Details", "#"
    @tour_user = TourUser.find params[:id]
    @visited_stop = VisitedStop.where(tour_id: @community.tour.id,tour_user_id: @tour_user.id).group_by(&:tour_stop_id)
    @alerts = TourHistory.where(tour_user_id: @tour_user.id, tour_id: @community.tour.id)
    chatroom = Chatroom.find_by(tour_user_id: params[:id])
    @chatroom_id = chatroom.present? ? chatroom.id : 0

    unit_ids = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts.last.id, stop_type: "unit").map{|x| x.stop_id}.uniq
    amenity_ids = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts.last.id, stop_type: "amenity").map{|x| x.stop_id}.uniq
    @existing_stops = []
    unless @community.is_sitemap
      units = @community.floorplates.first.units.where(id: unit_ids)
      amenities = @community.floorplates.first.amenities.where(id: amenity_ids)
    end
    @existing_stops << units if units.present?
    @existing_stops << amenities if amenities.present?

    # testing lines
    unless amenities.present?
      puts '------------------ testing line amenities --------------------'
      @existing_stops << Amenity.where(amenityable_type: "Floorplate", id: [297, 1360, 1022, 1023])
    end
    
    # testing lines
    unless units.present?
      puts '------------------ testing line units --------------------'
      @existing_stops << (Floorplate.find 265).units
    end
    # touruser_remotelock_data
  end

  def touruser_remotelock_data
    as_guests_data = @tour_user.as_guests.find_by(community_id: params[:community_id])
    if as_guests_data.present?
      tour_history = TourHistory.where(tour_user_id: @tour_user.id, tour_id: @community.tour.id)
      start_time = tour_history.last.arrived
      end_time = tour_history.last.left # needs update for lengthy stay

      access_token = RemoteLockService.new(@community).client_credentials
      page = 1

      while page < 5 do
      responce = RemoteLockService.new(@community).get_all_events(access_token,page)
      # binding.pry

      responce["data"].each do |event|
        # get all the lock/unlock events
        if event["type"] == "unlocked_event" or event["type"] == "locked_event" 
          # get successfull events by source = user
          if event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded"
            # get events of only this tour_user
            if event["attributes"]["associated_resource_id"] == as_guests_data.guest_id
              puts '---'*50
              puts event["attributes"]["occurred_at"].to_datetime
              puts '---'*50
              # binding.pry
              # get events if it lies b/w the time range of this tour_user
              if event["attributes"]["occurred_at"].to_datetime >= start_time and event["attributes"]["occurred_at"].to_datetime <= end_time
                # binding.pry
                event_type = event["type"]
                occurred_at = event["attributes"]["occurred_at"].to_datetime
                lock_id = event["attributes"]["publisher_id"]
                lock_type = event["attributes"]["publisher_type"]
                rml = RemoteLock.find_by(device_id: lock_id) 

                tour_history.last.lock_histories.create(event: event_type, occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: @tour_user.id)
              end
            end
          end
        end
      end
      page = page + 1
      end
    end
  end

  def lock_ploting
    tour_user_id = params[:tour_user_id]
    tour_history_id = params[:tour_history_id]
    floorplate_id = params[:floorplate_id]

    unit_ids = LockHistory.where(tour_user_id: tour_user_id, tour_history_id: tour_history_id, stop_type: "unit").map{|x| x.stop_id}.uniq
    amenity_ids = LockHistory.where(tour_user_id: tour_user_id, tour_history_id: tour_history_id, stop_type: "amenity").map{|x| x.stop_id}.uniq
    
    unless @community.is_sitemap
      units = (Floorplate.find floorplate_id).units.where(id: unit_ids)
      amenities = (Floorplate.find floorplate_id).amenities.where(id: amenity_ids)
    end

    @existing_stops = []
    @existing_stops << units if units.present?
    @existing_stops << amenities if amenities.present?

    # testing lines
    unless amenities.present?
      puts '------------------ testing line amenities --------------------'
      @existing_stops << Amenity.where(amenityable_type: "Floorplate", id: [297, 1360, 1022, 1023])
    end

    # testing lines
    unless units.present?
      puts '------------------ testing line units --------------------'
      @existing_stops << (Floorplate.find 265).units
    end

    render json: {existing_stops: @existing_stops}, status: 200
  end

  def destroy
    @community = Community.find params[:community_id]
    @tour_user = TourUser.find params[:id]

    @tour_user.tour_histories.delete_all
    @tour_user.visited_stops.delete_all
    @tour_user.schedual_tour.delete_all

    # @tour_user.destroy
    redirect_to community_tour_users_path(@community), :notice => "User deleted successfully"
  end

  def breadCrumb
    add_breadcrumb "Home", root_path
  end
  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end
end
