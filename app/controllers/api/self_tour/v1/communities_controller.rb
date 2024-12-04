module Api
  module SelfTour
    module V1
      class CommunitiesController < BaseController
        before_action :check_authorization
        before_action :load_community  
        before_action :load_tour_user
        before_action :random_string_generator, only: [:initialize_tour]
        before_action :load_tour, only: [:initialize_tour, :customize_tour, :start_tour]
        before_action :load_building_list, only: [:customize_tour, :start_tour]
        before_action :load_floors_list, only: [:customize_tour, :start_tour]
        
        before_action :copy_sort_hash_if_needed, only: :customize_tour
        after_action :update_deleted_stops_list, except: :customize_tour
        after_action :restore_sort_hash, except: :customize_tour
        before_action :sort_stops_list, only: [:customize_tour]

        include DweloDevicesHelper
        include ApplicationHelper
        include ToursHelper
        include TourStopsHelper
        include StripeServices
        include ShortestPath

        def user_tour_status
          if @community.present? and @tour_user.present?
            @tour_session_type = "unscheduled"
            should_range_be_checked = true
            @tour_user.tour_type = "virtual_tour"                                           # initilize by virtual tour
            @location_received = false
            @is_tour_completed = false

            if params[:latitude].present? and params[:longitude].present?
              @tour_user.latitude = params[:latitude]
              @tour_user.longitude = params[:longitude]
              @location_received = true
            end

            @within_one_km = geo_distance(@tour_user.latitude, @tour_user.longitude, @community.latitude, @community.longitude, 1)

            timezone = @community.get_time_zone()
            current_time = current_community_time(@community, params)
            @is_salesforce_crm = @community.is_salesforce_community?
            
            if @in_visiting_hours = is_tour_in_visiting_hours(current_time, @community)
              unless @is_salesforce_crm
                @scheduled_data = nearest_time_tour(@community, @tour_user, current_time)
                @is_tour_completed = @scheduled_data.on_time_tour.is_tour_completed rescue false

                if @community.community_tour.only_scheduled_tour
                  if @scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?
                    if @location_received and @within_one_km
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
                @is_tour_completed = @scheduled_data.on_time_tour.is_tour_completed rescue false

                if @scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?
                  if @location_received and @within_one_km
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

              if should_range_be_checked and @location_received and @within_one_km
                  @tour_user.tour_type = (@scheduled_data.tours_exist and @scheduled_data.on_time_tour.present?) ? @scheduled_data.on_time_tour.tour_type : "self_tour" # if he is not on_time, he should not take guided tour
              elsif should_range_be_checked
                @tour_user.tour_type = "self_tour"
              end
            end

            if (@within_one_km && ( @tour_user.tour_type == "self_tour"))
              tour_user_arrival_email(@tour_user, @community)
              @tour_user.arrival_email_sent = true
            else
              @tour_user.arrival_email_sent = false
            end

            @tour_user.save
            @verfication_type = params[:id_verification].present? ? @community.community_tour.verification_type : "email"
          end
        end

        def initialize_tour
          @floorplans = get_floorplans_with_required_filter()
          @tour_type = params[:tour_status] rescue @tour_user.tour_type
          @tour_user.update(tour_type: params[:tour_status], tour_key: @random_string, verified_by: params[:verfied_by_provider])
          charge_for_id_verfication(@tour_user, 200) if (do_verfication params[:verfied_by_provider], @community)
          PropertyAccessCode.new(@community ,@tour_user, @tour_type).restrict_property_access_with_code
        end

        def customize_tour
        end

        def generate_locks_accesses
          begin
            create_zerv_user(@community, @tour_user)
            current_time = current_community_time(@community, params)
            lock_access_by_type(params, @community, @tour_user, current_time) if @community.enable_locks and @tour_user.tour_type != "virtual_tour"
            @tour_user.update(lock_access_time: current_time)

            render :json=> {status: true, :message => "Locks access generation is started", code: 200}
          rescue => e
            render :json=> {status: false, :message => "Locks Access not Granted: #{e.message}", code: 500}
          end
        end

        def check_lock_access
          # counter = check_lock_access_counter(@tour_user)
          # puts "1 - Counter #{counter}"
          puts "Igloohome: #{@tour_user.igloohome_status}"
          puts "Dwelo: #{@tour_user.dwelo_status}"
          puts "EdgeState: #{@tour_user.edge_state_status}"
          puts "Latch: #{@tour_user.latch_status}"
          puts "Zerv: #{@tour_user.zerv_status}"
          # && !(counter >= 20)
          if ( @community.enable_locks && (params[:tour_type] == "self_tour" || params[:tour_type] == "guided_tour"))
            if ((@community.multiple_locks_provider.include?("Igloohome") && (@tour_user.igloohome_status == "in progress")) || (@community.multiple_locks_provider.include?("Dwelo") && (@tour_user.dwelo_status == "in progress")) || (@community.multiple_locks_provider.include?("EdgeState")  && (@tour_user.edge_state_status == "in progress")) || (@community.multiple_locks_provider.include?("Latch")  && (@tour_user.latch_status == "in progress")) || (@community.multiple_locks_provider.include?("Zerv")  && (@tour_user.zerv_status == "in progress")))
              puts "Lock Condition Fail"
              # puts "Counter #{counter}" 
              render :json=> {success: "false", completed: false}
            else
              puts "Lock Condition True"
              # puts "Counter #{counter}" 
              render :json=> {success: "true", completed: true}
            end
          else
            puts "Else Condition Fail"
            render :json=> {success: "false", completed: false}
          end
        end

        def start_tour
          if @community.present? && @tour_user.present?
            @tours = [@tour]
            session["check_lock_access#{@tour_user.id.to_s}"] = 0
            current_time = current_community_time(@community, params)
            @tour_sort_hash = CustomizeTourService.new(@community, @tour_user).get_tour_sort_hash
            @all_elevators = @community.elevators.map{|x| [x,x.floors, x.building]}       
            @chat_count = chat_room_count(@tour_user, @community)
          else
            render :json=> {:success=>false, :message => "Community or tour user not found"}
          end
        end
        
        private

        def copy_sort_hash_if_needed
          return if @community.customization_enabled?
          if @tour&.copy_sort_hash&.present? &&  @tour&.copy_sort_hash === "{}"
            @tour.update(copy_sort_hash: @tour.sort_hash)
          end
        end
      
        def restore_sort_hash
          begin
            return if @community.customization_enabled?

            if @tour.copy_sort_hash.present? &&  @tour.copy_sort_hash != "{}"
              @tour.update(sort_hash: @tour.copy_sort_hash, copy_sort_hash: "{}")
            end
          rescue => e
          end
        end

        def update_deleted_stops_list
          begin
            @community.update(deleted_ids: [])
            @tour.update(copy_sort_hash: "{}") if @tour.present?
          rescue => e
          end
        end

        def chat_room_count tour_user, community
          chatroom = Chatroom.find_by(tour_user_id: tour_user.id, tour_id: community.community_tour.id)
          Chat.where("name = ? AND chatroom_id = ?", "Support Team", chatroom.id).last.id rescue 0
        end

        def check_lock_access_counter(tu)
          session["check_lock_access"+tu.id.to_s] = 0 if (session["check_lock_access"+tu.id.to_s].nil? || (session["check_lock_access"+tu.id.to_s] == 20))
          session["check_lock_access"+tu.id.to_s] += 1
          puts "&$"*30, session["check_lock_access"+tu.id.to_s]
          session["check_lock_access"+tu.id.to_s]
        end

        def update_verification_attributes
          if (params[:verfied_by_provider] && params[:verified_at]).present? && @community.community_tour.visual_id_verification
            @tour_user.update_attributes(authentiq_verified_at: params[:verified_at].to_datetime, is_authentiq_verified: true) if @community.community_tour.verification_type == "authenteq" && params[:verfied_by_provider] == "authenteq"
            @tour_user.update_attributes(checkpoint_verified_at: params[:verified_at].to_datetime, is_checkpoint_verified: true) if @community.community_tour.verification_type == "check_point_id" && params[:verfied_by_provider] == "check_point_id"
          end
        end

        def sort_stops_list
          UpdateTourStopsSortingOrder.new(@community, @tour_user).sort() if @community.auto_wayfinding
        end

        def load_floors_list
          @floor_list = Floors.new(@community).get_community_floors
          @floor_list_temp = Floors.new(@community).get_community_temp_floors(@floor_list)
        end

        def load_building_list
          @building_list = Buildings.new(@community).get_community_buildings
        end

        def load_tour
          @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
        end

        def load_community
          @community = Community.find(params[:community_id])
        end

        def load_tour_user
          @tour_user = TourUser.find_by_id(params[:tour_user_id])
        end

        def random_string_generator
          @random_string = SecureRandom.hex
        end

        def get_floorplans_with_required_filter
          all_floorplans = FloorplanUnitsService.new(@community).get_floorplans
          all_floorplans = all_floorplans.sort_by {|f| f.bedrooms}.uniq { |b| b.bedrooms }
          all_floorplans
        end

        def charge_for_id_verfication(tour_user, amount)
          return unless tour_user.strip_customer_id.present?
          charge_customer(tour_user, amount, "Charging for Id verfication", 'usd')
        end

        def do_verfication verfied_by_provider, community
          (verfied_by_provider == "authenteq") && community.community_tour.tour_setting.present? && community.community_tour.tour_setting.charge_user_for_id_verfication
        end

        def check_authorization
          has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
          render json: {message: "Invalid Token, Not Authorized!", success_code: 401, status: false} unless has_access
        end

      end
    end
  end
end