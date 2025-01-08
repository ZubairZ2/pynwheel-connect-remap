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
        if(@params[:action] === "index")
          track_session = return_new_session
        else
          track_session = return_last_maps_session
          return unless track_session.present?
        end

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
          track_session = return_new_session
        else
          check_map_interactions(track_session)
        end

        track_session.updated_at = fetch_datetime()
        track_session
      end

      def check_map_interactions track_session
        is_interaction = false
        if ["index", "favorites", "save_favorite"].include?(@params[:action])
          is_interaction = true
        elsif @params[:action] == "activity_tracking"
          if @params[:activity][:event] == "click" && ["sent_favorite", "apply_now_count", "unit_marker"].include?(@params[:activity][:name])
            is_interaction = true
          end
        end
        
        if is_interaction
          last_active = return_community_datetime(track_session.map_interactions_last_active)
          if session_datetime_not_in_limit?(last_active)
            track_session.map_interactions += 1
            track_session.map_interactions_last_active = return_community_datetime(Time.now)
          end
        end
      end
      
      def update_last_session_end_datetime(track_session, track_session_last_updated_at)
        track_session.update_column(:end_datetime, track_session_last_updated_at) if track_session.end_datetime.nil?
      end

      def get_track_sessions
        # TrackSession.where(community_id: @community, session_id: @cookies[:webpages_session_id], partner: @partner)
        TrackSession.where(community_id: @community, partner: @partner)
      end

      def return_new_session
        TrackSession.new(
          start_datetime: (fetch_datetime),
          track_session_type: "maps",
          community_id: @community.id,
          community_time_zone: @timezone,
          # session_id: @cookies[:webpages_session_id],
          partner: @partner,
          map_interactions_last_active: return_community_datetime(Time.now)
        )
      end

      def manage_session_info(track_session)
        visited_pages = track_session.visited_pages
      
        case @params[:action]
        when "index"
          visited_pages << "Webpage main page" unless visited_pages.include?("Webpage main page")
          track_session.map_interactions_last_active = return_community_datetime(Time.now)
        when "favorites"
          visited_pages << "View favorites page" unless visited_pages.include?("View favorites page")
          track_session.map_interactions_last_active = return_community_datetime(Time.now)
        when "save_favorite"
          track_session.favorite_saved_counter += 1
          track_session.map_interactions_last_active = return_community_datetime(Time.now)
        when "activity_tracking"
          track_session_activity(track_session)
        end
      
        track_session.visited_pages = visited_pages
      end

      def track_session_activity track_session
        activity = @params[:activity]

        if activity.present? && activity[:event].present?
          case activity[:event]
          when "click"
            track_click_events(activity[:name], track_session)
          when "hover"
            track_hover_events(activity[:name], track_session)
          end
        end
      end 

      def track_click_events event, track_session
        case event
        when "unit_marker"
          track_session.unit_marker_clicks += 1
          track_session.price_opened_counter += 1
          track_session.map_interactions_last_active = return_community_datetime(Time.now)
        when "amenity_marker"
          track_session.amenity_marker_clicks += 1
        when "amenity_marker"
          track_session.amenity_marker_clicks += 1
        when "sorting_filter"
          track_session.sorting_filter_clicks += 1
        when "bedroom_filter"
          track_session.bedroom_filter_clicks += 1
        when "pricing_filter"
          track_session.pricing_filter_clicks += 1
        when "square_feet_filter"
          track_session.square_feet_filter_clicks += 1
        when "availability_filter"
          track_session.availability_filter_clicks += 1
        when "reset_filter"
          track_session.reset_filter_clicks += 1
        when "view_saved"
          track_session.view_saved_clicks += 1
        when "schedule_tour"
          track_session.schedule_tour_clicks += 1
        when "logo"
          track_session.logo_clicks += 1
        when "floor_number"
          track_session.floor_number_clicks += 1
        when "zoom_in"
          track_session.zoom_in_clicks += 1
        when "zoom_out"
          track_session.zoom_out_clicks += 1
        when "zoom_refresh"
          track_session.zoom_refresh_clicks += 1
        when "clear_favorites"
          track_session.clear_favorites_clicks += 1
        when "sent_favorite"
          track_session.favorite_sent_counter += 1
          track_session.map_interactions_last_active = return_community_datetime(Time.now)
        when "apply_now_count"
          track_session.apply_click_counter += 1
          track_session.map_interactions_last_active = return_community_datetime(Time.now)
        when "virtual_tour"
          track_session.virtual_tour_clicks += 1
        when "unit_modal_buttons"
          track_session.unit_modal_buttons_clicks += 1
        when "open_pricing_matrix"
          track_session.open_pricing_matrix_clicks += 1
        when "hide_pricing_matrix"
          track_session.hide_pricing_matrix_clicks += 1
        when "other"
          track_session.other_clicks +=1
        end
      end
      
      def track_hover_events event, track_session
        case event
        when "unit_marker"
          track_session.unit_marker_hovers += 1
        when "amenity_marker"
          track_session.amenity_marker_hovers += 1
        when "other"
          track_session.other_hovers +=1
        end
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
