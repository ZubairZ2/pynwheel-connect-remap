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
        # every time you close browser new session id will create
        if @session[:last_active_datetime].nil?
          @session[:last_active_datetime] = fetch_datetime
          session_nil = true
        end

        track_sessions = get_track_sessions()

        # Make a new session if not found or session limit expire otherwise retrurn last session 
        if !track_sessions.any? || session_nil
          session_nil = false

          if track_sessions.any? && track_sessions.last.end_datetime.nil?
            last_session = track_sessions.last
            last_date_time = @cookies[:coo_last_active_datetime].present? ? return_community_datetime(@cookies[:coo_last_active_datetime]) + 1.minutes : return_community_datetime(last_session.start_datetime.to_s) + 10.minutes
            last_session.update_column(:end_datetime, last_date_time)
            track_session = return_new_session 
          else
            track_session = return_new_session
          end

        elsif track_sessions.last.end_datetime.present? 
            track_session = return_new_session 
        elsif session_datetime_not_in_limit?(return_community_datetime(@session[:last_active_datetime]))
          if track_sessions.last.end_datetime.nil?
            last_session = track_sessions.last
            last_session.update_column(:end_datetime, (return_community_datetime(@session[:last_active_datetime]) + 10.minutes) )
            track_session = return_new_session 
          else
            track_session = return_new_session
          end
        else
          track_session = track_sessions.last
        end

        @session[:last_active_datetime] = fetch_datetime
        @cookies.permanent[:coo_last_active_datetime] = fetch_datetime

        track_session
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
