module Analytics
  class MapsAnalyticsService
    def initialize(community, timezone, session, cookies, params)
      @community = community
      @timezone = timezone
      @session = session
      @cookies = cookies
      @params = params
    end

    def maintain_maps_session
      track_session = return_last_maps_session
      manage_session_info(track_session)
      track_session.save
    end  
    
    private
    
      def return_last_maps_session
        initialize_last_active_datetime
        track_sessions = get_track_sessions()      
        return return_new_session unless track_sessions.any?
      
        track_session = track_sessions.last
      
        if session_datetime_not_in_limit?(return_community_datetime(@session[:last_active_datetime]))
          update_last_session_end_datetime(track_session)
          track_session = return_new_session
        end
      
        @session[:last_active_datetime] = fetch_datetime
        track_session
      end
      
      def initialize_last_active_datetime
        @session[:last_active_datetime] = fetch_datetime if @session[:last_active_datetime].nil?
      end
      
      def update_last_session_end_datetime(track_session)
        track_session.update_column(:end_datetime, (return_community_datetime(@session[:last_active_datetime]) + 10.minutes)) if track_session.end_datetime.nil?
      end

      def get_track_sessions
        TrackSession.where(session_id: @cookies[:webpages_session_id])
      end

      def return_new_session
        TrackSession.new(start_datetime: (fetch_datetime), track_session_type: "maps", community_id: @community.id, community_time_zone: @timezone,session_id: @cookies[:webpages_session_id])
      end

      def manage_session_info(track_session)
        visited_pages = track_session.visited_pages
      
        case @params[:action]
        when "index"
          visited_pages << "Webpage main page" unless visited_pages.include?("Webpage main page")
        when "favorites"
          visited_pages << "View favorites page" unless visited_pages.include?("View favorites page")
        when "save_favorite"
          track_session.favorite_saved_counter += 1
        when "sent_favorite"
          track_session.favorite_sent_counter += 1
        when "price_opened"
          track_session.price_opened_counter += 1
        when "apply_now_count"
          track_session.apply_click_counter += 1
        end
      
        track_session.visited_pages = visited_pages
      end
    
      def session_datetime_not_in_limit?(session_datetime)
        current_datetime = fetch_datetime
        (current_datetime - session_datetime) > 10.minutes
      end
      
      def fetch_datetime
        Time.zone.now.utc.in_time_zone(@timezone)
      end

      def return_community_datetime(datetime)
        datetime.in_time_zone(@timezone).to_datetime if datetime.present? && @timezone.present?
      end  
  end
end
