module Api
  module V1
    class CommunitiesController < BaseController

      #before_action :set_community, only: [:data,:ios_data,:email_favorites]
      include DweloDevicesHelper
      include ApplicationHelper
      include ToursHelper
      include TourStopsHelper
      include SchedualToursHelper
      include StripeServices
      include ShortestPath
      
      before_action :check_authentication, only: [:lincoln_list_communities, :portico_list_communities]
      before_action :set_community, only: [:email_favorites, :metro_send_analytics_data, :ipad_send_analytics_data]
      before_action :load_tour_user, only: [:portico_list_communities, :lincoln_list_communities]
    
      require 'securerandom'
    
      def test_panzoom
        render :json=> {:success=>true, :message => "#{params['id']}", :operation => "zoom"}
      end
    
      def login
        begin
          str = params[:community_string]
          community = Community.where(code: str)
          unless community.present?
            community_group = CommunityGroup.where(code: str)
          end
          if community_group.present?
    
            community_group = community_group.first
    
            if community_group.inactivate == false
              render :json=> {:success=>true, :community => community_group.id,:name => community_group.name,:community_name => (Company.find community_group.company_id).name,:type => "community_group",:link => "/api/v1/communities/#{community_group.id}/data_group.json",:is_group => true , :message => "success", :operation => "login"}
            else
              render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
            end
          else
            if community.present?
              company = community.first.company
              group = CommunityGroup.find_by id: community.first.community_group_id if community.first.community_group_id.present?
              if company.inactivate == false && !(community.first.locked == true)
                group_link = group.present? ? "/api/v1/communities/#{group.id}/data_group.json" : nil
                render :json=> {:success=>true, :community => community.first.id,:name => community.first.name,:community_name => company.name,:type => "community",:link =>  group.present? ? group_link : "/api/v1/communities/#{community.first.id}/data.json",:is_group => group.present?, :message => "success", :operation => "login"}
              else
                render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
              end
            else
              render :json=> {:success=>false, :message => "Invalid code"}
            end
          end
    
        rescue Exception => e   
          render :json=> {:success=>false, :message => e.message}, :status=>500
        end
      end
    
    
      def data
        include_application_data
      end
    
      def ios_data
        include_application_data
        if !(@community.locked == true) && @community.company.inactivate == false
          render 'data'
        else
          render :json=> {:success=>false, :message => "Your application is inactive. Please contact support@pynwheel.com for help. Thank you!", :operation => "login"}
        end
      end
    
      def minimum_data
        include_application_data
        render json: {:ui_settigs=>UiPresenter.minimal_hash(@community),:homescreen=>HomescreenPresenter.minimal_hash(@community),:apartments=>ApartmentsPresenter.minimal_hash(@community,params[:action]),:neighborhood=>NeighborhoodPresenter.minimal_hash(@community),:favorite=>FavoritePresenter.minimal_hash(@community),:gallery=>GalleryPresenter.minimal_hash(@community,params[:action]),:additional_pages=>AdditionalPagesPresenter.minimal_hash(@community)}.to_json
        #render json: {:ui_settigs=>UiPresenter.minimal_hash(@community),:homescreen=>HomescreenPresenter.minimal_hash(@community),:apartments=>ApartmentsPresenter.minimal_hash(@community,params[:action]),:neighborhood=>NeighborhoodPresenter.minimal_hash(@community),:favorite=>FavoritePresenter.minimal_hash(@community),:additional_pages=>AdditionalPagesPresenter.minimal_hash(@community)}
      end
    
      def email_favorites
        begin
          if !@community.favorite_setting.present? || @community.favorite_setting.email_from.blank?
            render :json=> {:success=>false, :message => "Please specify sender email address in CMS first. Email from can't be empty.", :operation => "email favorites"}
          else
            if @community.email_favorites(params)
              render :json=> {:success=>true, :message => "success", :operation => "email favorites"}
            else
              render :json=> {:success=>false, :message => "No valid selections present"}
            end
          end
        rescue Exception => e   
          ExceptionNotifier.notify_exception(e,data: {community_id: @community.id})
          render :json=> {:success=>false, :message => e.message}, :status=>500
        end
      end

      def check_version
        begin
          allow_usage, redirect_url = get_version_access params
          render :json=> {success: true, message: "Version check successfully executed!", data: {allow_usage: allow_usage, redirect_url: redirect_url}}, status: 200
        rescue Exception => e
          render :json=> {success: false, message: e.message, data: {}}, status: 500
        end
      end
      
      def update_version
        app_version = AppVersion.first
        if app_version.version != params[:version]
          app_version.update_column(:version,params[:version])
        end
        render :json=> {:success=>true, :message => "success", :operation => "update version"}
      end
    
      def list_communities
        @communities = Community.where(touchscreen_app: true).select(:id,:name,:company_id,:locked,:latitude,:longitude,:address,:logo,:state,:city).includes(:company)
      end
    
      def portico_list_communities
        @allow_usage, @redirect_url = get_version_access params

        @communities = Community.select(:id, :name, :email, :phone, :company_id, :locked, :latitude, :longitude, :address, :logo, :state, :city, :restrict_access)
                                .includes(:company, :allowed_emails)
                                .self_tour_enabled_only

        unrestricted_properties = @communities.where(restrict_access: false)
        restricted_properties = @communities.where(restrict_access: true)

        user_allowed_properties = restricted_properties.joins(:allowed_emails)
                                                       .where(allowed_emails: { email: @tour_user.email.downcase })
                                                       .distinct

        @communities = unrestricted_properties + user_allowed_properties
      end
    
      def lincoln_list_communities
        @allow_usage, @redirect_url = get_version_access params 
        company = Company.where('lower(name) = ?', 'lincoln')
        @communities = Community.where(company_id: company.first.id).select(:id,:name,:email,:phone,:company_id,:locked,:latitude,:longitude,:address,:logo,:state,:city).includes(:company).self_tour_enabled_only rescue nil
      end
    
      def do_verfication verfied_by_provider, community
        if (verfied_by_provider == "authenteq") && community.community_tour.tour_setting.present? && community.community_tour.tour_setting.charge_user_for_id_verfication
          true
        else
          false
        end
      end
    
      def community_tours
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          require 'securerandom'
          @random_string = SecureRandom.hex
          @tour_user = TourUser.find_by_id params[:tour_user_id]
          @community = Community.find params[:id]
          
          @tours = []
          @tours <<  @community.community_tour
    
          @community.deleted_ids = []
          @tour_user.tour_key = @random_string
          @tour_user.tour_type = params[:tour_status]
          @community.save
          charge_for_id_verfication(@tour_user, 200) if (do_verfication params[:verfied_by_provider], @community)
          @tour_user.verified_by = params[:verfied_by_provider]
          @tour_user.lock_access_time = Time.now.utc
          @tour_user.save
          @tour_type = params[:tour_status] rescue @tour_user.tour_type
          send_user_arrival_email(@tour_user, @community)
          restrict_property_access_with_code(@community,@tour_user,@tour_type)
          time_zone = @community.get_time_zone()
          if (params[:verfied_by_provider] && params[:verified_at]).present? && @community.community_tour.visual_id_verification #TODO:: change to 1 month after testing
            @tour_user.update_columns(authentiq_verified_at: params[:verified_at].to_datetime,is_authentiq_verified: true) if @community.community_tour.verification_type == "authenteq" && params[:verfied_by_provider] == "authenteq"
            @tour_user.update_columns(checkpoint_verified_at: params[:verified_at].to_datetime,is_checkpoint_verified: true) if @community.community_tour.verification_type == "check_point_id" && params[:verfied_by_provider] == "check_point_id"
          end
          all_floorplans = FloorplanUnitsService.new(@community).get_floorplans
          @floorplans = all_floorplans.sort_by {|f| f.bedrooms}.distinct { |b| b.bedrooms }
    
          unless @tour_user.email == "Removed at Consumer Request"
            #####
            @building_list = @community.units.map{|x| x.building rescue next}.distinct.compact + @community.amenities.map{|x| x.building rescue next}.distinct.compact
            @building_list = @building_list.compact.reject { |c| c.empty? }.distinct.sort
            @building_list = @building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(@building_list).sort.map{|x,y| y}
            @community.community_tour.building_order.present? ? (@building_list =  @community.community_tour.building_order) : ""
    
            @floor_list = @community.floorplates.map{|x| x.floors}.flatten!.distinct.sort rescue []
            @floor_list_temp = (@floor_list - [@community.community_tour.starting_floor]).unshift(@community.community_tour.starting_floor) if @community.community_tour.starting_floor.present? rescue []
            #####
            current_time = current_community_time(@community, params)
            lock_access_by_type(params, @community, @tour_user, current_time) if @community.enable_locks and @tour_user.tour_type != "virtual_tour"
            @tour_user.lock_access_time = current_time
            @tour_user.save
          else
            render :json=> {:success=>false, :message => "Access Denied"}, :status=>500
          end
        end
      end
    
      def restrict_property_access_with_code(community,tour_user,tour_type)    
        if tour_type != "virtual_tour" && tour_user.check_code_expiry(community) 
          tour_user.property_access_code = generate_six_digit_random_pin
          tour_user.property_access_code_generated_at = Time.now
          tour_length_stay_limit = community&.community_tour&.tour_setting&.length_stay_limit
          tour_user.restricted_property_access = true
          visitor_name = tour_user.name.titleize
          sleep 1
          # create_tour_history(tour_user,tour_type,community)
          subject = "Property Access Code for #{visitor_name}"
          body = "#{visitor_name} is ready to start a Pynwheel Tour at #{community.name}. 
          Please instruct #{tour_user.first_name.titleize} to enter this property access code into the Pynwheel Tour app:<br>
          <br>#{tour_user.property_access_code}<br>
          <br>This code will expire in #{tour_length_stay_limit} minutes<br> 
          <br>Thanks!"
          send_access_code_email(subject, body, community)
        end
      end
    
      #TODO:: Incase if you need to create tourhistory here otherwise remove it later.
      def create_tour_history(tour_user,tour_type,community)
        tour_history = TourHistory.find_or_create_by(community_id: community.id, tour_user_id: tour_user.id) rescue TourHistory.new
        tour_history.update_columns(community_id: community.id, tour_type: tour_type, tour_user_id: tour_user.id, tour_id: community.community_tour.id)
        last_arrival = tour_user.tour_histories.where(tour_id: community.community_tour.id).last rescue nil
        last_arrival.update_columns(arrived: Time.now) if last_arrival.present?
      end
    
      def send_access_code_email subj, body, community
        return if community.blank?
        emails = community.email.gsub(" ","").split(',')
        emails.each do |email|
          NotificationMailer.tour_history_mail(subj, body, email,INFO_EMAIL,community,false,nil).deliver
        end
      end
        
      def delete_tour_stop
        @community = Community.find params[:id]
        delete_array = params[:stop_id].split(",") if params[:stop_id].present?
        te = @community.community_tour.tour_stops.where(display_stop: false).map{|x| x.id} rescue []
        @community.deleted_ids = delete_array.present? ? delete_array + te : [] + te
        @community.save 
        @tours = []
        @tours = @community.community_tour
    
        @tour_user = TourUser.find_by(id: params[:tour_user_id])
    
        @building_list = @floor_list = []
    
        @building_list = @community.units.map{|x| x.building rescue next}.distinct.compact + @community.amenities.map{|x| x.building rescue next}.distinct.compact
        @building_list = @building_list.compact.reject { |c| c.empty? }.distinct.sort
        @building_list = @building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(@building_list).sort.map{|x,y| y}
        @community.community_tour.building_order.present? ? (@building_list =  @community.community_tour.building_order) : ""
    
        @floor_list = @community.floorplates.map{|x| x.floors}.flatten!.distinct.sort rescue nil
        current_time = current_community_time(@community, params)
    
        edge_state = EdgeState.find_by(community_id: params[:id])
        if @community.enable_locks and @community.multiple_locks_provider.include?("EdgeState") and edge_state.present? and @tour_user.tour_type != "virtual_tour"
          Thread.new do
            access_token = RemoteLockService.new(@community).client_credentials
            allowed_stops = @community.community_tour.tour_stops.where(display_stop: true).pluck(:stop_id)
            allowed_stops << @community.community_tour.id
            locks = RemoteLock.where(stop_id: allowed_stops, edge_state_id: edge_state.id).pluck(:device_id, :remote_lock_type)
            if locks.present?
              tour_user_guest_id = @tour_user.as_guests.where(community_id: @community.id).last.guest_id rescue ''
              locks.each do |lock|
                RemoteLockService.new(@community).grant_access(access_token, tour_user_guest_id ,lock[0] ,lock[1])
              end
            end
          end
        end
      end
    
      def delete_tour_stop_v1
        puts params
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          @community = Community.find params[:id] if params[:id].present?
          @tour_user = TourUser.find_by(id: params[:tour_user_id]) if params[:tour_user_id].present?
    
          if @community.present? && @tour_user.present?
            delete_array = params[:stop_id].gsub(/[\[\]']/, '').split(",").map(&:to_i) if params[:stop_id].present?
            te = tour_stops_ids(@community.community_tour, @tour_user, @community)
            @community.deleted_ids = delete_array.present? ? delete_array + te : [] + te
            @community.save
            @tours = [@community.community_tour]
    
            session["check_lock_access"+@tour_user.id.to_s] = 0
            current_time = current_community_time(@community, params)
    
            @building_list = @floor_list = []
    
            @building_list = @community.units.map{|x| x.building rescue next}.distinct.compact + @community.amenities.map{|x| x.building rescue next}.distinct.compact
            @building_list = @building_list.compact.reject { |c| c.empty? }.distinct.sort
            @building_list = @building_list.map {|i| i.gsub(/\d+/) {|s| "%08d" % s.to_i } }.zip(@building_list).sort.map{|x,y| y}
            @community.community_tour.building_order.present? ? (@building_list =  @community.community_tour.building_order) : ""
            
            @floor_list = @community.floorplates.map{|x| x.floors}.flatten!.distinct.sort rescue nil
    
            chatroom = Chatroom.find_by(tour_user_id: @tour_user.id, tour_id: @community.community_tour.id)
            @chat_count = Chat.where("name = ? AND chatroom_id = ?", "Support Team", chatroom.id).last.id rescue 0
            @floor_list_temp = (@floor_list - [@tours.last.starting_floor]).unshift(@tours.last.starting_floor) if @tours.last.starting_floor.present? rescue nil
            @all_elevators = @community.elevators.map{|x| [x,x.floors, x.building]}
            chatroom = Chatroom.find_by(tour_user_id: @tour_user.id, tour_id: @community.community_tour.id)
            @chat_count = Chat.where("name = ? AND chatroom_id = ?", "Support Team", chatroom.id).last.id rescue 0
    
            edge_state = EdgeState.find_by(community_id: params[:id])
            
            if @community.enable_locks and @community.multiple_locks_provider.include?("EdgeState") and edge_state.present? and @tour_user.tour_type != "virtual_tour"
              Thread.new do
                access_token = RemoteLockService.new(@community).client_credentials
                allowed_stops = allowed_stop_ids(@tour_user, @community)
                allowed_stops << @community.community_tour.id
                locks = RemoteLock.where(stop_id: allowed_stops, edge_state_id: edge_state.id).pluck(:device_id, :remote_lock_type)
                if locks.present?
                  tour_user_guest_id = @tour_user.as_guests.where(community_id: @community.id).last.guest_id rescue ''
                  locks.each do |lock|
                    RemoteLockService.new(@community).grant_access(access_token, tour_user_guest_id ,lock[0] ,lock[1])
                  end
                end
              end
            else
              @dwelo_guest_id = @tour_user.as_guests.where(dwelo_guest: true).first.guest_id rescue nil
            end
            check_zerv_user_existance_again(@community, @tour_user, params[:locks_thread_ref])
          else
            render :json=> {:success=>false, :message => "Community or tour user not found"}
          end
        else
            render :json=> {:success=>false, :message => "Invalid Token"}
        end
      end
    
      def user_saved_tour
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          @community = Community.find params[:community_id] if params[:community_id].present?
          @tour_user = TourUser.find params[:tour_user_id]
          @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
          chatroom = Chatroom.find_by(tour_user_id: @tour_user.id, tour_id: @community.community_tour.id)
          @latest_message_id = Chat.where("name = ? AND chatroom_id = ?", "Support Team", chatroom.id).last.id rescue 0
          
          stops_arr = []
          if @community.is_sitemap
            stops_arr = @community.mdu ? @tour.tour_stops.where(display_stop: true).order(:sort) :  @tour.tour_stops.where(display_stop: true, stop_type: "amenity").order(:sort)
          else
            @building_list = @floor_list = []
    
            @building_list = Buildings.new(@community).get_community_buildings
            @floor_list = Floors.new(@community).get_community_floors
            tour_sort_hash = CustomizeTourService.new(@community, @tour_user).get_tour_sort_hash
    
            @building_list << "" if @building_list == []
            @building_list.each do |building|
              if @floor_list.present?
                @floor_list.each do |floor|
                  if tour_sort_hash[building + ","+ floor.to_s].present?
                    tour_sort_hash[building + ","+ floor.to_s].each do |s_id|
                      if (s_id.present?)
                        stop = (TourStop.find_by_id(s_id))
                        stops_arr << stop if (stop.display_stop && (@community.mdu ? true : (stop.stop_type != "unit")) ) rescue next
                      end
                    end
                  end
                end
              end
            end
          end
          
          stops_arr = stops_arr.compact.map{|x| x.id}.distinct
    
          un_ordered_visited_stops = VisitedStop.where(tour_user_id: @tour_user.id ,tour_id: @tour.id ).map{|x| x.tour_stop_id}.distinct
          
          # @visited_stops = VisitedStop.where(tour_user_id: @tour_user.id, tour_id: @tour.id).order(created_at: :desc).map{|x| x.tour_stop_id}.distinct

          @visited_stops = []
          
          stops_arr.each do |val|
            if un_ordered_visited_stops.include?(val)
              @visited_stops << val
            end
          end
    
          @community.present? ? @last_vs = VisitedStop.where(tour_user_id: @tour_user.id,tour_id: @tour.id).last : @last_vs = VisitedStop.where(tour_user_id: @tour_user.id).last
          
          current_time = current_community_time(@community, params)
          @in_visiting_hours = is_tour_in_visiting_hours(current_time, @community) if @community.present?
    
        end
      end
    
      def get_count_screen
        data = Hash.new
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          @tour_user = TourUser.find_by_id params[:tour_user_id]
          if @tour_user.present?
            @visited_history = VisitedStop.exists?(tour_user_id:  @tour_user.id)
            upcoming = []
            completed_tours = []
            schedule_tours = @tour_user.schedual_tours
            if schedule_tours.length > 0
              schedule_tours.each do |tour|
                upcoming << get_community_tour(tour) if !tour.is_tour_completed && !date_compare(tour)
                completed_tours << get_community_tour(tour) if tour.is_tour_completed
              end
            end
            data = {user: @tour_user, upcoming_tours: upcoming.count, completed_tours:  completed_tours.count, visited_history: @visited_history}
            render :json=> {data: data, :status=>true, :message => "data retuned succesfully", code: 200}
          else
            render :json=> {data: data, :status=>false, :message => "Invalid or Missing comunity_id/tour_user_id", code: 400}
          end
        else
          render :json=> {data: data, :status=>false, :message => "Invalid Token", code: 401}
        end
      end
    
      def metro_send_analytics_data
        community = Community.find_by_id params[:community_id]
        Analytics::MetroAnalyticsService.new(community).create_analytics_session(params) if community.present?
        render :json=> {:status=>true, code: 200}
      end

      def ipad_send_analytics_data
        begin
          Analytics::IpadAnalyticsService.new(@community).create_analytics_session(params)
          render :json=> {status: true, code: 200, message: "RN touch app analytics data sent sucessfully!"}
        rescue => exception
          render :json=> {status: false, code: 401, message: exception.message}
        end
      end
    
      def get_tour_user
        tour_user_id = params[:tour_user_id].downcase
        if tour_user_id.present?
          @tour_user = TourUser.find_by(email: tour_user_id)
          if @tour_user.present?
            @visited_history = VisitedStop.exists?(tour_user_id:  @tour_user.id)
            @scheduled_tours = []
            if @tour_user.schedual_tours.present?
              @tour_user.schedual_tours.each do |tour|
                @scheduled_tours << tour if !tour.is_tour_completed && !date_compare(tour)
              end
            end
    
            render :json => {status: true, user: @tour_user, code: 200, visited_history: @visited_history, schedule_tour: @scheduled_tours.count}
          else
            render :json => {status: false, error: "Email not found", code: 400}
          end
        else
          render :json => {status: false, error: "Email not provided", code: 400}
        end
      end
    
      def get_tour_user_by_tour
        data = Hash.new
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          @tour_user = TourUser.find_by_id params[:tour_user_id]
          if @tour_user.present?
            @visited_history = VisitedStop.exists?(tour_user_id:  @tour_user.id)
            community_visited = []
            @tour_user.visited_stops.each do |stop|
              community_visited << stop.tour.community
            end
            @scheduled_tours = @tour_user.schedual_tours
            data = {visited_history: @visited_history, tour_user: @tour_user, scheduled: @scheduled_tours.count, visited: community_visited.distinct}
            render :json=> {data: data, :status=>true, :message => "data retuned succesfully", code: 200}
          else
            render :json=> {data: data, :status=>false, :message => "Invalid or Missing comunity_id/tour_user_id", code: 400}
          end
        else
          render :json=> {data: data, :status=>false, :message => "Invalid Token", code: 401}
        end
      end
        
    
      def tour_user_data
        data = Hash.new
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          @community = Community.find_by_id params[:id]
          @tour_user = TourUser.find_by_id params[:tour_user_id]
          if @community.present? and @tour_user.present?
            TourUserCustomization.new(@community, @tour_user).customize_tour
            @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
            @visited_history = VisitedStop.exists?(tour_user_id:  @tour_user.id ,tour_id: @tour.id)
            visiting_hours = @community&.opening_hours.present? ? @community&.opening_hours : []
            @gallery = @community&.galleries.present? ?  @community&.galleries.order(:sort) : []
            data = {visited_history: @visited_history, tour_user: @tour_user, community: @community, visiting_hours: visiting_hours.as_json, property_images: @gallery.as_json}
            render :json=> {data: data, :status=>true, :message => "data retuned succesfully", code: 200}
          else
            render :json=> {data: data, :status=>false, :message => "Invalid or Missing comunity_id/tour_user_id", code: 400}
          end
        else
          render :json=> {data: data, :status=>false, :message => "Invalid Token", code: 401}
        end
      end
    
      def get_filtered_tours
        data = Hash.new
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          @tour_user = TourUser.find_by_id params[:tour_user_id]
          if @tour_user.present?
            @scheduled_tours = @tour_user.schedual_tours
            upcoming_tours = []
            completed_tours = []
            expired_tours = []
            last_visit = nil
            
            if @scheduled_tours.present?
              @scheduled_tours.each do |tour|
                if tour.present?
                  completed_tours << get_community_tour(tour) if tour.is_tour_completed
                  expired_tours << get_community_tour(tour) if !tour.is_tour_completed && date_compare(tour)
                  upcoming_tours << get_community_tour(tour) if !tour.is_tour_completed && !date_compare(tour)
                end
              end
    
              last_visit = get_last_visited_community(@scheduled_tours)
              data = {tour_user: @tour_user, last_visit: last_visit, upcoming: upcoming_tours.distinct, completed: completed_tours.distinct, exipred: expired_tours.distinct }
              render :json=> {data: data.as_json, :status=> true, :message => "data returned succesfully", code: 200 }
            else
              data = {tour_user: @tour_user, last_visit: last_visit, upcoming: upcoming_tours, completed: completed_tours, exipred: expired_tours }
              render :json=> { data: data.as_json, :status=>true, code: 200 }
            end
    
            AccessLogsService.new().get_filtered_tours_access_logs(params, data)
          else
            render :json=> { data: data, :status=>false, :message => "Invalid or Missing tour_user_id", code: 400 }
          end
        else
          render :json=> { data: data, :status=>false, :message => "Invalid Token", code: 401 }
        end
      end
    
      def tour_configrations
        #################### Remember this call is being called twice for one of the usecase in mobile app #######################
        puts params
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          if params[:id].present? and params[:tour_user_id].present?
            @community = Community.find_by_id params[:id]
            if @community.present?
              @tour = @community.community_tour
              @tour_user = TourUser.find_by_id params[:tour_user_id]
              
              @locks_thread = create_zerv_user(@community, @tour_user) if params[:second_time].present? and ( params[:second_time] == "false" || params[:second_time] == false )
              @visited_history = VisitedStop.exists?(tour_user_id:  @tour_user.id ,tour_id: @tour.id )
              @verfication_type = params[:id_verification].present? ? @tour.verification_type : "email" rescue "email"
              timezone = @community.get_time_zone()
              current_time = (timezone != "UTC") ? Time.now.in_time_zone(timezone) : (params[:current_time].present? ? params[:current_time].to_datetime : Time.now.in_time_zone(timezone))
    
              @limit_exceeded = (@community.community_tour.tour_setting.do_limit_max_tour ? check_guest_limit(@community, current_time, @community.community_tour.tour_setting.limit_max_tour,@tour_user) : false)
              @in_visiting_hours = is_tour_in_visiting_hours(current_time, @community)
              
              @tour_user.is_virtual_tour = ( (@in_visiting_hours ? false : true)  || @limit_exceeded)
              @tour_user.latitude = params[:latitude]
              @tour_user.longitude = params[:longitude]
              # @tour_user.update_columns(is_virtual_tour: ((@in_visiting_hours.present? ? (@in_visiting_hours ? false : true) : false) || @limit_exceeded), latitude: params[:latitude], longitude: params[:longitude])
    
              if @community.credential.present? and @community.credential.use_different_crm_provider and @community.crm_credential.present? and @community.crm_credential.crm_provider == "salesforce"
                response = SalesforceServices::GetBookingByNeighbor.call(community: @community, tour_user: @tour_user)
                if response.success? and response.payload.present?
                  @scheduled_tours = response.payload.find_all{ |b| ( (b["Account__r"]["Name"].downcase.parameterize.gsub("-", "").gsub("_", "") == @community.name.downcase.parameterize.gsub("-", "").gsub("_", "")) and b["Status__c"] == "Scheduled" and b["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone).strftime("%Y-%m-%d") == Time.now.in_time_zone(timezone).strftime("%Y-%m-%d")) }
                  if @scheduled_tours.present?
                    @is_tour_ontime = is_sf_tour_on_time(@scheduled_tours, current_time, @tour.grace_period, timezone)
                    current_tour = @is_tour_ontime
    
                    unless @is_tour_ontime.present?
                      @tour_status , nearest_tour = sf_tour_time_status(@scheduled_tours, current_time, timezone)
                      current_tour = nearest_tour
                      @tour_user.tour_type = "virtual_tour"
                    end
    
                    @tour_date = current_tour.present? ?  current_tour["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone).strftime('%_m/%d/%Y')  : "---"
                    @tour_time = current_tour.present? ?  current_tour["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone).strftime('%l:%M %P') : "---"
                    
                    Prospect.where(community_id: @community.id,  tour_user_id: @tour_user.id, crm_provider: "salesforce").update_all(sf_status: "deleted")
                    Prospect.create(community_id: @community.id, tour_user_id: @tour_user.id, data_provider: @community.data_provider, crm_provider: "salesforce", sf_booking_id: current_tour["Id"], sf_booking_name: current_tour["Name"], sf_guest_id: current_tour["Contact__r"]["Id"], sf_status: "active")
    
                  end
                end
              else
    
                @scheduled_tours = get_scheduled_tours(@community.id, @tour_user.id, current_time)
                @tour_user.update_columns(is_virtual_tour: ((@in_visiting_hours ? false : true ) || @limit_exceeded), latitude: params[:latitude], longitude: params[:longitude])
    
                if @scheduled_tours.present?
                  @is_tour_ontime = is_tour_on_time(current_time, @scheduled_tours, @tour.grace_period)
                  current_tour = @is_tour_ontime
    
                  unless @is_tour_ontime.present?
                    @tour_status , nearest_tour = tour_time_status(@scheduled_tours, current_time)
                    current_tour = nearest_tour
                  end
                  
                  @tour_user.tour_type = check_tour_type(@tour_status, current_tour, @tour, @is_tour_ontime) 
    
                  @tour_date = current_tour.present? ? current_tour.tour_date.strftime('%_m/%d/%Y')  : "---"
                  @tour_time = current_tour.present? ? current_tour.tour_time.strftime('%l:%M %P') : "---"
                else
                  @tour_user.tour_type = (!@tour.only_scheduled_tour ? "self_tour" : "virtual_tour")
                end
              end
              @tour_user.save
            end
          end
        end
      end
    
      def tour_configrations_v1
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        @tour_session_type = "unscheduled"
        if has_access
          if params[:id].present? and params[:tour_user_id].present?
            @community = Community.find_by_id params[:id]
            @tour_user = TourUser.find_by_id params[:tour_user_id]
    
            if @community.present? and @tour_user.present?
              should_range_be_checked = true
              @tour_user.tour_type = "virtual_tour"                                           # initilize by virtual tour
              @location_received = false
    
              if params[:latitude].present? and params[:latitude].present?
                @tour_user.latitude = params[:latitude]
                @tour_user.longitude = params[:longitude]
                @location_received = true
              end
    
              @within_one_km = geo_distance(@tour_user.latitude, @tour_user.longitude, @community.latitude, @community.longitude, 1)
    
              timezone = @community.get_time_zone()
              current_time = current_community_time(@community, params)
              @is_salesforce_crm = (@community.credential.present? and @community.credential.use_different_crm_provider and @community.crm_credential.present? and @community.crm_credential.crm_provider == "salesforce") ? true : false
    
              if @in_visiting_hours = is_tour_in_visiting_hours(current_time, @community)
                unless @limit_exceeded = (@community.community_tour.tour_setting.do_limit_max_tour ? check_guest_limit(@community, current_time, @community.community_tour.tour_setting.limit_max_tour,@tour_user) : false)
                  unless @is_salesforce_crm
                    @scheduled_data = nearest_time_tour(@community, @tour_user, current_time)
                    if @community.community_tour.only_scheduled_tour
                      if @scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?
                        if @location_received and (@within_one_km = geo_distance(@tour_user.latitude, @tour_user.longitude, @community.latitude, @community.longitude, 1))
                          @tour_user.tour_type = @scheduled_data.on_time_tour.tour_type          # either scheduled tour is self_tour/guided_tour
                        else
                          @tour_user.tour_type = "self_tour"
                        end
                      elsif @scheduled_data.tours_exist and !@scheduled_data.on_time_tour.present?
                        @tour_date = @scheduled_data.nearest_tour.tour_date.strftime('%_m/%d/%Y')
                        @tour_time = @scheduled_data.nearest_tour.tour_time.strftime('%l:%M %P')
                      end
                      should_range_be_checked = false
                    end
                    @tour_session_type = "scheduled" if (@scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?)
                  else
                    @scheduled_data = sf_nearest_time_tour(@community, @tour_user, current_time, timezone)
                    if @scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?
                      if @location_received and (@within_one_km = geo_distance(@tour_user.latitude, @tour_user.longitude, @community.latitude, @community.longitude, 1))
                        # @tour_user.tour_type = @scheduled_data.on_time_tour.tour_type   ----   # whatever responded in API resonpse
                      else
                        @tour_user.tour_type = "self_tour"
                      end
                    elsif @scheduled_data.tours_exist and !@scheduled_data.on_time_tour.present?
                      @tour_date = @scheduled_data.nearest_tour["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone).strftime('%_m/%d/%Y')
                      @tour_time = @scheduled_data.nearest_tour["Tour_Start_Time__c"].to_datetime.in_time_zone(timezone).strftime('%l:%M %P')
                    end
                    should_range_be_checked = false
                  end
    
                  if should_range_be_checked and @location_received and ((@within_one_km = geo_distance(@tour_user.latitude, @tour_user.longitude, @community.latitude, @community.longitude, 1)))
                      @tour_user.tour_type = (@scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?) ? @scheduled_data.on_time_tour.tour_type : "self_tour" # if he is not on_time, he should not take guided tour
                  elsif should_range_be_checked
                    @tour_user.tour_type = "self_tour"
                  end
                end
              end
    
              if (@within_one_km && ( @tour_user.tour_type == "self_tour"))
                tour_user_arrival_email(@tour_user, @community)
                @tour_user.arrival_email_sent = true
              else
                @tour_user.arrival_email_sent = false
              end
              @locks_thread = create_zerv_user(@community, @tour_user)
              @tour_user.save
              @verfication_type = params[:id_verification].present? ? @community.community_tour.verification_type : "email"
            end
            @tour_user.save
          end
        end
      end
      
      def charge_for_id_verfication(tour_user, amount)
        if tour_user.strip_customer_id.present?
          charge_customer(tour_user, amount, "Charging for Id verfication", 'usd')
        end
      end
    
      def check_lock_access
        puts params
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          community = Community.find params[:id]
          tu = TourUser.find params[:tour_user_id]
          counter = check_lock_access_counter(tu)
          if (params[:tour_type] == "self_tour" && tu.tour_type != "guided_tour" && community.enable_locks)
            if ((community.multiple_locks_provider.include?("Igloohome") && (tu.igloohome_status == "in progress")) || (community.multiple_locks_provider.include?("Dwelo") && (tu.dwelo_status == "in progress")) || (community.multiple_locks_provider.include?("EdgeState")  && (tu.edge_state_status == "in progress")) || (community.multiple_locks_provider.include?("Latch")  && (tu.latch_status == "in progress")) || (community.multiple_locks_provider.include?("Zerv")  && (tu.zerv_status == "in progress")) && !(counter >= 20))
              render :json=> {success: "false", completed: false}
            else
              render :json=> {success: "true", completed: true}
            end
          else
            render :json=> {success: "false", completed: false}
          end
        else
          render :json=> {:status=>false, :message => "Invalid Token", code: 401}
        end
      end
      
      def check_lock_access_counter(tu)
        session["check_lock_access"+tu.id.to_s] = 0 if (session["check_lock_access"+tu.id.to_s].nil? || (session["check_lock_access"+tu.id.to_s] == 20))
        session["check_lock_access"+tu.id.to_s] += 1
        puts "&$"*30, session["check_lock_access"+tu.id.to_s]
        session["check_lock_access"+tu.id.to_s]
      end
      
      def check_zerv_user_existance_again(community, tour_user, thread_ref)
        # if community.enable_locks and community.multiple_locks_provider.include?("Zerv") and community.zerv.present? and tour_user.tour_type != "virtual_tour"
        #   puts "-----------------------------------------     main thread halted    ---------------------------------------------------"
        #   begin
        #     unless thread_ref == "null"
        #       available_stops = community.community_tour.tour_stops.where(display_stop: true).pluck(:stop_type, :stop_id)
        #       available_stops << ["tour", community.community_tour.id]
        #       allowed_stops = available_stops.map{ |stop| stop[0].classify.constantize.find_by_id stop[1] }.compact
    
        #       thread_ref = thread_ref.gsub("run", "sleep")
        #       locks_thread = Thread.list.select {|thread| thread if thread.to_s == thread_ref}.compact
    
        #       if locks_thread.present? and locks_thread[0].present? and locks_thread[0].alive?
        #         puts "-----------------------------------------  locks thread joined  ---------------------------------------------------"
        #         locks_thread[0].join(18)
        #       end
    
        #       if tour_user.zerv_guests.where(community_id: community.id, status: "active", res_errors: nil).blank?
        #         ZervServices::GetUserWithAccessesService.call(is_resident: false, community: community, tour_user: tour_user, stop_list: allowed_stops, checking_twice: true)
        #       end
    
        #     end
        #   rescue => exception
        #     puts exception
        #   end
        #   puts "-----------------------------------------  main thread continued  -----------------------------------------"
        # end
      end
      
      def include_application_data
        @version = AppVersion.first.version
        @community = fetch_property_data(params[:id])
      end
    
      def update_unit_floorplan_data
        # community = Community.find(params[:id])
        # community.update_community_provider_data()
        render :json=> {:success=>true, :message => "success", :operation => "update data"}
      end
    
      def data_group
        @version = AppVersion.first.version
        @community_group = CommunityGroup.find params[:id]
        @communities = []
    
        @community_group.communities.each do |com|
          community = fetch_property_data(com.id)
          @communities << community unless community.locked
        end
        @community_master = Community.find_by(community_group_id: @community_group.id,master_community: true)
        unless @community_master.present?
          @community_master = Community.where(community_group_id: @community_group.id).first
        end
      end

      def get_neighbourhood_data
        if params[:token] == "pynwheeltoken12345"
          app_version = AppVersion.first
    
          @community = (params[:id].to_i == 1 ? (Community.find(748)) : (Community.find params[:id]))
          @community.neighborhood_request_counter = @community.neighborhood_request_counter + 1
          result = nil
          if @community.neighborhood_request_counter < @community.neighborhood_request_counter_limit
            NeighbourhoodLog.create(from_ip: request.ip,cat: params[:cat])
            begin
              if @community.neighborhood_request_counter > 19 && @community.neighborhood_request_counter < 21 && !@community.limit_200_hit
                com = Community.find params[:id]
                com.neighbourhood_counter_mail_200
                @community.limit_200_hit = true
                NeighbourhoodMailer.email_counter_200("salahudin@pynwheel.com","salahudin@intagleo.com","","Testing api calls 200").deliver
              end
              if @community.neighborhood_request_counter > 39 && @community.neighborhood_request_counter < 41 && !@community.limit_400_hit
                com = Community.find params[:id]
                com.neighbourhood_counter_mail_400
                @community.limit_400_hit = true
                NeighbourhoodMailer.email_counter_400("salahudin@pynwheel.com","salahudin@intagleo.com","","Testing api calls 400").deliver
              end
            rescue => ex
    
            end
            @url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{params[:cat]}&location=#{params[:latitude]},#{params[:longitude]}&radius=#{params[:radius]}&key=AIzaSyCOUsWrubjWjFSmsTs68dJT7u9ah7hDGMI"
            response = HTTParty.get(@url)
            # @client = GooglePlaces::Client.new()
            results = []
            # cata = []
            # cata << params[:cat]
            # result = @client.spots(params[:latitude].to_f, params[:longitude].to_f,:radius => params[:radius].to_i, :types => cata)
    
            if response['next_page_token'].present? && (params[:cat] == "restaurant" || params[:cat] == "school" || params[:cat] == "park" || params[:cat] == "bank" || params[:cat] == "atm" )
              results << response
              begin
                @url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json?types=#{params[:cat]}&location=#{params[:latitude]},#{params[:longitude]}&radius=#{params[:radius]}&key=AIzaSyCOUsWrubjWjFSmsTs68dJT7u9ah7hDGMI&pagetoken=#{response['next_page_token']}"
                sleep 2
                response = HTTParty.get(@url)
              rescue  => ex
              end
            end
            results = []
            results << response
            render :json=> {:success=>true,:counter => @community.neighborhood_request_counter, :message => results}, :status=>200
          else
            render :json=> {:success=>true,:counter => @community.neighborhood_request_counter, :message => "Limit Exceeded"}, :status=>200
          end
          @community.save
        else
          render :json=> {:success=>false, :message => "You are not allowd to make this call."}, :status=>200
        end
      end
    
      def reset_counter
        app_version = AppVersion.first
        app_version.neighborhood_counter = 0
        app_version.save
        render :json=> {:success=>true,:counter => app_version.neighborhood_counter}, :status=>200
      end
    
      def unit_and_floorplan_data
        @community = Community.find params[:id]
        @units = {}
        @floorplans = []
        perform(@community , @community.credential)
    
      end
    
      def perform(community , credentials)
        @community = community
        @credentials = credentials
        property_ids = @credentials.property_id.split(',') rescue []
        property_ids.each do |property_id|
          begin
            @@floorplanHash = {}
            if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
              url = @credentials.entrata_url
            else
              url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
            end
    
    
            password = @credentials.password
            username = @credentials.username
            #property_id = credentials.property_id
    
            response = HTTParty.post(url,
                                      :body => {
                                          "auth": {
                                              "type": "basic",
                                              "password": password,
                                              "username": username
                                          },
                                          "method": {
                                              "name": "getMitsPropertyUnits",
                                              "params": {
                                                  "propertyIds": property_id,
                                                  "availableUnitsOnly": credentials&.entrata_available_units_only,
                                                  "showUnitSpaces": credentials&.entrata_show_unit_spaces
                                              }
                                          }
                                      }.to_json,
                                      :headers => { 'Content-Type' => 'application/json' } )
            response =  JSON.parse(response.body)
            # if com_test.id == 458
            #   com_test.entrata_exception_logs = com_test.entrata_exception_logs + "3 "
            #   com_test.save
            # end
            sleep 2
            if response["response"]["code"] == 200
              units = []
              floorplans = []
              response['response']['result']["PhysicalProperty"]["Property"].each do |pro|
                pro["ILS_Unit"].each do |ils|
                  units << ils
                end
                pro["Floorplan"].each do |f|
                  floorplans << f
                end
              end
    
    
              save_psi_floorplans(floorplans,property_id)
    
              save_psi_units(units,property_id,@credentials)
    
              # save_website_column_of_community(response)
              #else
              #puts '-----------------------------' , response["response"]["error"]["message"]
              #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
            else
    
            end
          rescue => e
    
            puts '----------------------------' , e.message
            #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
          end
        end
        begin
        rescue => ex
        end
        fill_psi_pricing_details
        @units = @units.values
      end
    
      def save_psi_units(units,property_id,credentials)
        units.each do |u|
          vacateDate = ""
          # unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"])#.first_or_initialize
          # unless unit.present?
          #   unit = Unit.find_by(provider: "psi",community_id: credentials.community_id,provider_unit_id: u["Units"]["Unit"]["Identification"]["IDValue"])#.first_or_initialize
          # end
          unit = Unit.new
          if unit.present?
            unit.provider_unit_id = u["Units"]["Unit"]["Identification"]["IDValue"].to_s + "-"+ u["Units"]["Unit"]["MarketingName"]
            unit.community_id = credentials.community_id
            unit.property_id = property_id
            unit.unit_type = u["Units"]["Unit"]["UnitType"]
            unit.marketing_name = u["Units"]["Unit"]["MarketingName"]
    
            unit.floorplan_id = u["Units"]["Unit"]["@attributes"]["FloorPlanId"]
            if u["Units"]["Unit"]["MarketRent"].present?
              unit.market_rent = u["Units"]["Unit"]["MarketRent"]
            end
            unless unit.effective_rent_is_updated.present? && unit.effective_rent_is_updated && unit.manual_override
              if u["Units"]["Unit"]["MarketRent"].present?
                unit.effective_rent = u["Units"]["Unit"]["MarketRent"]
              elsif u["EffectiveRent"].present?
                unit.effective_rent = u["EffectiveRent"]
                # else
                  unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
              end
            end
    
            unit.effective_rent = @@floorplanHash[u["Units"]["Unit"]["FloorplanName"]].to_f
            if u["EffectiveRent"].present?
              unit.effective_rent = u["EffectiveRent"]
            else
              unit.effective_rent = 0
            end
            unit.floor = u["FloorLevel"]
            unless unit.availability_is_updated.present? && unit.availability_is_updated && unit.manual_override
              unit.availability = u["Availability"]["VacancyClass"] if !unit.sold
              unit.available = false if !unit.sold
            end
    
            if u["Availability"]["VacancyClass"] == "Unoccupied"
              unit.available = true if !unit.sold
              year = u["Availability"]["VacateDate"]["@attributes"]["Year"]
              month = u["Availability"]["VacateDate"]["@attributes"]["Month"]
              day = u["Availability"]["VacateDate"]["@attributes"]["Day"]
              vacateDate = Date.parse("#{year}-#{month}-#{day}")
            end
            unless unit.available_date_is_updated.present? && unit.available_date_is_updated && unit.manual_override
              unit.available_date = vacateDate
            end
            unit.availability_url = u['UnitAvailabilityURL'] if u['UnitAvailabilityURL'].present?
            building = u["Units"]["Unit"]["BuildingName"]
            unit.building = building.present? ? building.gsub("Building ", "") : ""
            @units[unit.provider_unit_id] = unit
            # unit.save(validate: false)
    
    
    
    
    
    
          end
        end
      end
    
      def fill_psi_pricing_details
        floorplanHash = Hash.new
        property_ids = @credentials.property_id.split(',') rescue []
        property_ids.each do |property_id|
          move_in_dates = getMoveInDate(property_id)
          unless move_in_dates.present?
            move_in_dates = []
            move_in_dates << "0"
          end
          ########################################## Space configuration
          move_in_dates.each do |move_in_date|
            begin
              if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
                url = @credentials.entrata_url
              else
                url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
              end
              password = @credentials.password
              username = @credentials.username
              #property_id = credentials.property_id
              if move_in_date == "0"
                response = HTTParty.post(url,
                                          :body => {
                                              "auth": {
                                                  "type": "basic",
                                                  "password": password,
                                                  "username": username
                                              },
                                              "method": {
                                                  "name": "getUnitsAvailabilityAndPricing",
                                                  "params": {
                                                      "propertyId": property_id,
                                                      "availableUnitsOnly": credentials&.entrata_available_units_only,
                                                      "showUnitSpaces": credentials&.entrata_show_unit_spaces,
                                                      "useSpaceConfiguration": credentials&.entrata_use_space_configuration
                                                  }
                                              }
                                          }.to_json,
                                          :headers => { 'Content-Type' => 'application/json' } )
                response =  JSON.parse(response.body)
              else
                response = HTTParty.post(url,
                                          :body => {
                                              "auth": {
                                                  "type": "basic",
                                                  "password": password,
                                                  "username": username
                                              },
                                              "method": {
                                                  "name": "getUnitsAvailabilityAndPricing",
                                                  "params": {
                                                      "propertyId": property_id,
                                                      "availableUnitsOnly": credentials&.entrata_available_units_only,
                                                      "showUnitSpaces": credentials&.entrata_show_unit_spaces,
                                                      "useSpaceConfiguration": credentials&.entrata_use_space_configuration,
                                                      "moveInStartDate": move_in_date
                                                  }
                                              }
                                          }.to_json,
                                          :headers => { 'Content-Type' => 'application/json' } )
                response =  JSON.parse(response.body)
              end
              sleep 3
    
              if response["response"]["code"] == 200
                unless response["response"]["result"].include?('No records found')
                  psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
                  psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
                  psi_floorplan.each_with_index do |f,index|
                    floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
                  end
                  psi_units.each do |u|
                    u['UnitSpace'].each do |us|
    
                      begin
                        if u['UnitSpace'].count == 1
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s]
                          unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                            unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]]
                            # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)],community_id: credentials.community_id)
                          end
                        else
                          unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                            unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                            # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                          end
                        end
                        unless unit.present?
                          unit = @units[ u["@attributes"]["Id"]]
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"],community_id: credentials.community_id)
                        end
                        unless unit.present? # for unit with have extra 'A' in unit number getavailabilityandpricing
                          unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                          # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                        end
    
                        if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                          unit.availability = 'Unoccupied' if !unit.sold
                          unit.available = true if !unit.sold
                        else
                          unit.availability = 'Occupied'
                          unit.available = false
                        end
    
                        if us[1]["@attributes"]["AvailableOn"].present?
                          date = us[1]["@attributes"]["AvailableOn"]
                          dateSplit = date.split('/')
                          day = dateSplit[0]
                          month = dateSplit[1]
                          year = dateSplit[2]
                          unit.available_date = Date.parse("#{month}-#{day}-#{year}")
                        end
                        if (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).present? && (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_i > 0
                          unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
                        elsif floorplanHash[u["@attributes"]["FloorPlanName"]] > 0.0
                          unit.effective_rent = floorplanHash[u["@attributes"]["FloorPlanName"]]
                        else
                          unit.effective_rent = 0.0
                        end
                        rentStr = ""
                        begin
                          if us[1]["Rent"]["TermRent"].count > 1# && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                            us[1]["Rent"]["TermRent"].each do |tr|
                              spaceOption = tr["@attributes"]["SpaceOption"].present? ? tr["@attributes"]["SpaceOption"] : "" rescue ""
                              startDate = tr["@attributes"]["StartDate"].present? ? tr["@attributes"]["StartDate"] : "" rescue ""
                              endDate = tr["@attributes"]["EndDate"].present? ? tr["@attributes"]["EndDate"] : "" rescue ""
                              rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +":"+spaceOption+":"+startDate+":"+endDate+";"
                            end
                          end
                        rescue => rt_ex
    
                        end
    
                        unit.lease_pricing = rentStr
                        @units.index(unit)
                        @units[unit.provider_unit_id] = unit
                          # unit.save(validate: false)
                      rescue => ex
                        puts "---------------- Space configuration inside loop", ex.message
                      end
                    end
                  end
                  puts "&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&"* 300
                  #else
                  #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
                else
                  #################################### with unit space pricing
                  begin
                    if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
                      url = @credentials.entrata_url
                    else
                      url = "https://"+@credentials.entrata_url+".entrata.com/api/v1/propertyunits"
                    end
                    password = @credentials.password
                    username = @credentials.username
                    #property_id = credentials.property_id
                    response = HTTParty.post(url,
                                              :body => {
                                                  "auth": {
                                                      "type": "basic",
                                                      "password": password,
                                                      "username": username
                                                  },
                                                  "method": {
                                                      "name": "getUnitsAvailabilityAndPricing",
                                                      "params": {
                                                          "propertyId": property_id,
                                                          "availableUnitsOnly": credentials&.entrata_available_units_only,
                                                          "showUnitSpaces": credentials&.entrata_show_unit_spaces
                                                      }
                                                  }
                                              }.to_json,
                                              :headers => { 'Content-Type' => 'application/json' } )
                    response =  JSON.parse(response.body)
                    sleep 3
                    if response["response"]["code"] == 200
                      psi_units = response["response"]["result"]["PropertyUnits"]["PropertyUnit"]
                      psi_floorplan = response["response"]["result"]["Properties"]["Property"][0]["Floorplans"]["Floorplan"]
                      psi_floorplan.each_with_index do |f,index|
                        floorplanHash[psi_floorplan[index]["Name"]] = (psi_floorplan[index]["MarketRent"]["@attributes"]["Min"].to_s.gsub(/[\s,]/ ,"")).to_f
                      end
                      psi_units.each do |u|
                        u['UnitSpace'].each do |us|
                          begin
                            if u['UnitSpace'].count == 1
                              # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                              unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s]
                              unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                                unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]]
                                # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)],community_id: credentials.community_id)
                              end
                            else
                              unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                              # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                              unless unit.present? # for unit with have extra 'A' in unit number in getavailabilityandpricing
                                unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                                # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                              end
                            end
                            unless unit.present?
                              unit = @units[ u["@attributes"]["Id"]]
                              # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"],community_id: credentials.community_id)
                            end
                            unless unit.present? # for unit with have extra 'A' in unit number getavailabilityandpricing
                              unit = @units[ u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s]
                              # unit = Unit.find_by(provider_unit_id: u["@attributes"]["Id"].to_s+"-"+u["@attributes"]["UnitNumber"].to_s[0..(u["@attributes"]["UnitNumber"].length - 2)]+"-"+us[1]["@attributes"]["UnitNumber"].to_s,community_id: credentials.community_id)
                            end
    
                            if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                              unit.availability = 'Unoccupied' if !unit.sold
                              unit.available = true if !unit.sold
                            else
                              unit.availability = 'Occupied'
                              unit.available = false
                            end
                            if us[1]["@attributes"]["Availability"].present? && us[1]["@attributes"]["Availability"] == "Available"
                              unit.availability = 'Unoccupied' if !unit.sold
                              unit.available = true if !unit.sold
                            else
                              unit.availability = 'Occupied'
                              unit.available = false
                            end
    
                            if us[1]["@attributes"]["AvailableOn"].present?
                              date = us[1]["@attributes"]["AvailableOn"]
                              dateSplit = date.split('/')
                              day = dateSplit[0]
                              month = dateSplit[1]
                              year = dateSplit[2]
                              unit.available_date = Date.parse("#{month}-#{day}-#{year}")
                            end
                            if (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).present? && (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_i > 0
                              unit.effective_rent = (us[1]["Rent"]["@attributes"]["MinRent"].gsub(/[\s,]/ ,"")).to_f
                            elsif floorplanHash[u["@attributes"]["FloorPlanName"]] > 0.0
                              unit.effective_rent = floorplanHash[u["@attributes"]["FloorPlanName"]]
                            else
                              unit.effective_rent = 0.0
                            end
                            rentStr = ""
                            begin
                              if us[1]["Rent"]["TermRent"].count > 1 #0 && us[1]["Rent"]["TermRent"][0]["@attributes"]["LeaseTerm"].present?
                                us[1]["Rent"]["TermRent"].each do |tr|
                                  rentStr = rentStr + tr["@attributes"]["LeaseTerm"].split(" ")[0] +":"+ tr["@attributes"]["Rent"].gsub(/[\s,]/ ,"") +"::;"
                                end
                              end
                            rescue => rt_ex
    
                            end
    
                            unit.lease_pricing = rentStr
    
                            @units[unit.provider_unit_id] = unit
                              # unit.save(validate: false)
                          rescue => ex
                            puts "---------------- filling pricing inside loop", ex.message
                          end
                        end
                      end
                      #else
                      #ExceptionNotifier.notify_exception(Exception.new,data: {message: response["response"]["error"]["message"],community_id: credentials.community_id})
                    end
                  rescue => e
    
                    puts '-------------- filling pricing --------------' , e.message
                    #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
                  end
    
                  ####################################
                end
    
              end
            rescue => e
              # begin
              #   com = Community.find credentials.community_id
              #   unless com.entrata_exception_logs.present?
              #     com.entrata_exception_logs = ""
              #   end
              #   com.entrata_exception_logs = Time.now.to_s + com.entrata_exception_logs + "|||||||Pricing|||||||| " + com.id.to_s + "--- "+ e.message
              #   com.save
              # rescue => r
              # end
              puts '-------------- filling pricing --------------' , e.message
              #ExceptionNotifier.notify_exception(e,data: {community_id: credentials.community_id})
            end
          end
    
          ##########################################
    
    
        end
      end
    
      def save_psi_floorplans(floorplans,property_id)
    
        floorplans.each do |f|
          floorplan = Floorplan.new
          # floorplan = Floorplan.find_by(provider: "psi",community_id: credentials.community_id,provider_floorplan_id: f["Identification"]["IDValue"])#.first_or_initialize
          if floorplan.present?
            floorplan.property_id = property_id
            floorplan.name = f["Name"]
            floorplan.unit_count = f["UnitsAvailable"]
            floorplan.units_available = f["DisplayedUnitsAvailable"]
            floorplan.deposit = f["Deposit"]["Amount"]["ValueRange"]["@attributes"]["Min"]
            floorplan.availability_url = f["FloorplanAvailabilityURL"] if f["FloorplanAvailabilityURL"].present?
    
    
            room_types = f["Room"]
            room_types.each do |rt|
              if rt["@attributes"]["RoomType"] == "Bedroom"
                floorplan.bedrooms = rt["Count"]
              else
                floorplan.bathrooms = rt["Count"]
              end
            end
    
            if f["SquareFeet"]["@attributes"]["Min"].to_f > 0
    
              floorplan.square_feet = f["SquareFeet"]["@attributes"]["Min"]
            else
    
    
              floorplan.square_feet = f["SquareFeet"]["@attributes"]["Max"]
            end
            if f["MarketRent"]["@attributes"]["Min"].to_f > 0
              @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Min"]
            else
              @@floorplanHash[f["Name"]] = f["MarketRent"]["@attributes"]["Max"]
            end
            if f["MarketRent"]["@attributes"]["Min"].to_f > 0
    
              floorplan.market_rent = f["MarketRent"]["@attributes"]["Min"]
            else
    
              floorplan.market_rent = f["MarketRent"]["@attributes"]["Max"]
            end
          end
          @floorplans << floorplan
          # floorplan.save(validate: false)
    
        end
      end
    
      def getMoveInDate(property_id)
        if @credentials.entrata_url.include?('https://') || @credentials.entrata_url.include?('http://')
          url = @credentials.entrata_url
        else
          url = "https://#{@credentials.entrata_url}.entrata.com/api/v1/properties"
        end
    
        password = @credentials.password
        username = @credentials.username
        #property_id = credentials.property_id
        begin
          response = HTTParty.post(url,
                                    :body => {
                                        "auth": {
                                            "type": "basic",
                                            "password": password,
                                            "username": username
                                        },
                                        "requestId": 15,
                                        "method": {
                                            "name": "getPropertyPickLists",
                                            "version":"r1",
                                            "params": {
                                                "propertyIds": property_id
                                            }
                                        }
                                    }.to_json,
                                    :headers => { 'Content-Type' => 'application/json' } )
          response =  JSON.parse(response.body)
          moveIn_dates = []
          response['response']['result']['Property'][0]['leasePeriods']['leasePeriod'].each do |dates|
            if dates['leaseStartDate'].present?
              moveIn_dates << dates['leaseStartDate']
            end
          end
        rescue
        end
        moveIn_dates
      end
    
      private

      def fetch_property_data community_id
        Community.includes( :imagepages,
                            :webpages,
                            :galleries,
                            {floorplans: [:amenities]},
                            :favorite_setting,
                            {sitemap: [:amenities]},
                            {floorplates: [:amenities]},
                            {units: [:floorplate]},
                            {gallery_images: [:gallery]},
                            {neighborhood: [:locations]},
                            {design: [:home_page_images,:home_page_video,:gable,:menu,:expressionist,:filter_panel]}
                          ).find_by_id(community_id)

      end
    
      def get_community_tour(tour)
    
        if !tour.tour_date.nil?
          t_date = tour.tour_date.to_datetime.strftime("%d %B %Y")
          t_time = tour.tour_time.to_datetime.strftime("%I:%M %p")
          # dt = DateTime.new(d.year, d.month, d.day, t.hour, t.min)
        else
          d_date = Time.now.in_time_zone(tour&.community&.get_time_zone()).strftime("%d %B %Y")
          t_time = Time.now.in_time_zone(tour&.community&.get_time_zone()).strftime("%I:%M %p")
          # dt = DateTime.now
        end
    
        display_tour_type = tour.scheduled_tour_type
        tour_type = tour_type.eql?("") ? tour.property_tour_type : tour.tour_type
        return {schedule_tour_url: tour.get_schedule_tour_url(), grace_period: tour.community.community_tour.grace_period, schedule_tour_id: tour.id, tour_type: tour_type, display_tour_type: display_tour_type , tour_time: "#{t_date} - #{t_time}", community: tour.community}
      end
    
      def get_last_visited_community(scheduled_tours)
        completed_tours = []
        scheduled_tours.order(:tour_time).each do |tour|
          if (!tour.tour_time.nil?)
            completed_tours << tour if tour.is_tour_completed
          end
        end
        if completed_tours.present?
          return {visited_time: completed_tours.last.tour_time, visited_community: completed_tours.last.community}
        else
          return nil
        end
      end
    
      def date_compare(tour)
        if tour.present?
          if (tour.tour_date && tour.tour_time).present?
            ( (tour.tour_date.to_s + " " + tour.tour_time.strftime("%I:%M%p")).in_time_zone(tour&.community&.get_time_zone()) + (tour.community.community_tour.grace_period.minutes) + 1.minute) <= (Time.now.in_time_zone(tour&.community&.get_time_zone()))
          else
            return false
          end
        else
          return false
        end    
      end
    
      def send_user_arrival_email tour_user, community
        unless (tour_user&.tour_type === "virtual_tour" || tour_user.arrival_email_sent)
          tour_user_arrival_email(tour_user, community)
        end
      end
    
      def load_tour_user
        @tour_user = TourUser.find params[:tour_user_id]
        rescue ActiveRecord::RecordNotFound
          render json: {success: false, error_code: 404, message: 'Tour User not found', data: nil}, status: :not_found
      end
    
      def set_community
        @community = Community.find(params[:id] || params[:community_id])

        rescue ActiveRecord::RecordNotFound
          render json: {success: false, error_code: 404, message: 'Community not found', data: nil}, status: :not_found
      end
    
      def check_authentication
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        render json: {message: "Not Authorized!", success_code: 401, status: false} unless has_access
      end

    end
  end
end