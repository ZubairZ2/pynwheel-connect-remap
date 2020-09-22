class TourUsersController < ApplicationController
  before_action :check_community
  before_action :breadCrumb
  skip_before_action :load_tour_users_chats, only: [:lock_ploting]
  # skip_before_action :authenticate_user!, :only => [:show]

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
    chatroom = Chatroom.find_by(tour_user_id: params[:id], tour_id: @community.tour.id)
    @chatroom_id = chatroom.present? ? chatroom.id : 0
    if current_user.is_view_visitor_details_page? && @tour_user.email != current_user.email
      redirect_to root_path
    end

    # ------------ locks ploting on the map ---------------- #
    @visited_units_history = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts.last.id, stop_type: "unit", event: "unlocked_event")
    @visited_amenities_history = LockHistory.where(tour_user_id: @tour_user.id, tour_history_id: @alerts.last.id, stop_type: "amenity", event: "unlocked_event")
    
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
 
    # ------------ evnets history below the maps ---------------- #
    # unless amenities.present?
    #   puts '------------------ testing line amenities --------------------'
    #   @existing_stops << Amenity.where(amenityable_type: "Floorplate", id: [297, 1360, 1022, 1023])
    # end
    
    # unless units.present?
    #   puts '------------------ testing line units --------------------'
    #   @existing_stops << (Floorplate.find 265).units
    # end
 end

  def lock_ploting
    community_id = params[:community_id]
    tour_user_id = params[:tour_user_id]
    tour_history_id = params[:tour_history_id]
    floorplate_id = params[:floorplate_id]

    community = Community.find community_id
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

    # unless amenities.present?
    #   puts '------------------ testing line amenities --------------------'
    #   @existing_stops << Amenity.where(amenityable_type: "Floorplate", id: [297, 1360, 1022, 1023])
    # end

    # unless units.present?
    #   puts '------------------ testing line units --------------------'
    #   @existing_stops << (Floorplate.find 265).units
    # end

    render json: {existing_stops: existing_stops, lock_histories: lock_histories}, status: 200

  end

  def destroy
    @community = Community.find params[:community_id]
    @tour_user = TourUser.find params[:id]
    @tour = @community.tour

    tour_histories = TourHistory.where(tour_user_id: @tour_user.id, tour_id: @tour.id).includes(:lock_histories)
    lock_histories_ids = tour_histories.all.map{|x| x.lock_histories.ids}.flatten
    LockHistory.where(id: lock_histories_ids).delete_all

    if @tour_user.chatrooms.find_by(tour_id: @tour.id).present?
      @tour_user.chatrooms.find_by(tour_id: @tour.id).chats.delete_all
      @tour_user.chatrooms.find_by(tour_id: @tour.id).delete
    end

    @tour_user.as_guests.find_by(community_id: @community.id).delete if @tour_user.as_guests.find_by(community_id: @community.id).present?
    @tour_user.igloo_guests.where(community_id: @community.id).delete_all if @tour_user.igloo_guests.find_by(community_id: @community.id).present?
    @tour_user.tour_histories.where(tour_id: @tour.id).delete_all
    @tour_user.visited_stops.where(tour_id: @tour.id).delete_all
    @tour_user.schedual_tours.where(community_id: @community.id).delete_all
    @tour_user.prospects.where(community_id: @community.id).delete_all

    # @tour_user.destroy
    redirect_to community_tour_users_path(@community), :notice => "User deleted successfully"
  end

  def breadCrumb
    add_breadcrumb "Home", root_path
  end
  def check_community
    return if params[:controller] == "tour_users" && params[:action]== "show"
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
