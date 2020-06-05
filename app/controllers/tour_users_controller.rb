class TourUsersController < ApplicationController
  before_action :check_community
  before_action :breadCrumb

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
    touruser_remotelock_data
  end

  def touruser_remotelock_data
    as_guests_data = @tour_user.as_guests.find_by(community_id: params[:id])
    if as_guests_data.present?
      access_token = RemoteLockService.new(@community).client_credentials
      responce = RemoteLockService.new(@community).get_all_events(access_token)
      tu = TourHistory.find_by(tour_user_id: @tour_user.id) 
      start_time = tu.arrived
      end_time = tu.left

      responce["data"].each do |event|
        # get all the lock/unlock events
        if event["type"] == "unlocked_event" or event["type"] == "locked_event" 
          # get successfull events by source = user
          if event["attributes"]["source"] == "user" and event["attributes"]["status"] == "succeeded"
            # get events of only this tour_user
            if event["attributes"]["associated_resource_id"] == as_guests_data.guest_id
              # get events if it lies b/w the time range of this tour_user
              if event["attributes"]["occurred_at"].to_datetime >= start_time and event["attributes"]["occurred_at"].to_datetime <= end_time
                
                event_type = event["type"]
                occurred_at = event["attributes"]["occurred_at"].to_datetime
                lock_id = event["attributes"]["publisher_id"]
                lock_type = event["attributes"]["publisher_type"]
                rml = RemoteLock.find_by(device_id: lock_id) 

                @tour_user.tour_histories.last.lock_histories.create(event: event_type, occured_at: occurred_at, stop_id: rml.stop_id, stop_name: rml.stop_name, stop_type: rml.stop_type , tour_user_id: @tour_user.id)
              end
            end
          end
        end
      end
      binding.pry
    end
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
