module Analytics
  class MapsAnalyticsService
    def initialize(community, timezone, session, cookies, params, request_url)
      @community = community
      @timezone = timezone
      @session = session
      @cookies = cookies
      @params = params
      @partner = parsed_request_url(request_url)
    end

    def maintain_maps_session
      begin
        track_session = return_last_maps_session
        return unless track_session.present?
        manage_session_info(track_session)
        track_session.save
      rescue StandardError => e
        puts "\n\n---------------------------#{e.message} ----------------------\n\n"
      end
    end
    
    private
    
      def return_last_maps_session
        track_sessions = get_track_sessions()
        return return_new_session unless track_sessions.any?
        track_session = track_sessions.last
        track_session_last_updated_at = return_community_datetime(track_session.updated_at)

        if session_datetime_not_in_limit?(track_session_last_updated_at)
          # update_last_session_end_datetime(track_session, track_session_last_updated_at)
          track_session = return_new_session
        end
        track_session.updated_at = fetch_datetime()
        track_session
      end
      
      def update_last_session_end_datetime(track_session, track_session_last_updated_at)
        track_session.update_column(:end_datetime, track_session_last_updated_at) if track_session.end_datetime.nil?
      end

      def get_track_sessions
        TrackSession.where(community_id: @community, session_id: @cookies[:webpages_session_id], partner: @partner)
      end

      def return_new_session
        TrackSession.new(start_datetime: (fetch_datetime), track_session_type: "maps", community_id: @community.id, community_time_zone: @timezone,session_id: @cookies[:webpages_session_id], partner: @partner)
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
        current_time = fetch_datetime()
        time_difference_in_minutes = ((current_time.to_datetime - session_datetime.to_datetime) * 24 * 60 ).to_i
        time_difference_in_minutes >= ENV["IDLE_TIME_MAPS"].to_i
      end
      
      def fetch_datetime
        Time.now.in_time_zone(@timezone)
      end

      def return_community_datetime(datetime)
        datetime.in_time_zone(@timezone).to_datetime if datetime.present? && @timezone.present?
      end

      def parsed_request_url request_url
        uri = URI.parse(request_url)
        if uri.query.present?
          query_params = CGI.parse(uri.query)
          query_params["partner"].first rescue nil
        else
          nil
        end
      end
  end
end
