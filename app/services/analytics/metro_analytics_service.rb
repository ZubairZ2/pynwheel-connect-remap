module Analytics
  class MetroAnalyticsService
    def initialize community
      @community = community
    end

    def create_analytics_session params
      TrackSession.create!(
        community_id: @community.id, 
        track_session_type: "metro", 
        start_datetime: params["SessionStartime"].to_datetime.in_time_zone( @community.time_zone ),
        end_datetime: params["SessionEndTime"].to_datetime.in_time_zone( @community.time_zone ),
        session_id: params["SeessionId"],
        visited_pages: additional_pages( params ),
        apply_click_counter: 0,
        favorite_saved_counter: params["FavouritesSaved"],
        favorite_sent_counter: params["FavouritesSent"],
        price_opened_counter: params["PricingOpened"],
        community_time_zone: @community.time_zone 
      )
    end

    private

      def additional_pages params
        visited_pages = params["additionalPage"]
        visited_pages.concat( (1..params["ApartmentsPageVisited"]).map{ "Apartments Page".upcase } )
        visited_pages.concat( (1..params["GalleryPageVisited"]).map{ "Gallery Page".upcase } )
        visited_pages.concat( (1..params["NeighbourhoodPageVisited"]).map{ "Neighborhood Page".upcase } )
        visited_pages.concat( (1..params["FavouritesPageVisited"]).map{ "Favorites Page".upcase } )

        visited_pages
      end
  end
end