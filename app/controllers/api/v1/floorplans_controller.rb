module Api
  module V1
    class FloorplansController < BaseController
      
      include ApplicationHelper
      before_action :authorize_access
      before_action :laod_community
      before_action :load_tour_user, except: [:index]
      before_action :load_tour_user_tour, except: [:index]
      before_action :skip_editing_tour_stops, only: [:update_tour_stops_list]

      def index
        floorplans = floorplan_units_service(@community).get_floorplans
        bedrooms = params[:bedrooms].present? ? params[:bedrooms].split(',') : "any"
        requested_bedrooms = bedrooms.map {|x| x.downcase.eql?("studio") ? "0" : x}
        any_option = bedrooms.map {|b| b.downcase.eql?("any")}
        filtered_floorplans = floorplans.present? ? floorplans.select {|b| requested_bedrooms.include?(b.bedrooms.to_i.to_s) } : [] unless any_option.include?(true) or bedrooms.blank?
        
        floorplans_list = any_option.include?(true) ? floorplans : filtered_floorplans 
        sorting_param = params[:sort_by].present? ? params[:sort_by] : "default"
        sorted_floorplans = floorplans_list.present? ? sort_floorplans(floorplans_list, sorting_param).uniq : []
        sorted_floorplans = available_floorplans_list(sorted_floorplans)
        @floorplans = Kaminari.paginate_array(sorted_floorplans).page(params[:page]).per(params[:per_page])
      end

      def floorplan_units
        if params[:floorplan_id].present?
          @floorplan = Floorplan.find_by_id(params[:floorplan_id])
          @units = floorplan_units_service(@community).get_floorplan_units(@floorplan)
          @floors = floorplan_units_service(@community).fetch_floors()
          @floorplates = floorplan_units_service(@community).get_floorplates
        else
          success = false
          message = 'Please provide floorplan id'
        end
      end

      def floorplan_amenities
        @amenities = floorplan_units_service(@community).get_floorplate_amenities
        @floors = floorplan_units_service(@community).fetch_floors()
        @floorplates = floorplan_units_service(@community).get_floorplates
      end

      def update_tour_stops_list
        return unless @tour.present?
        @tour_stop = @tour.tour_stops.where(stop_id: params[:stop_id]).last

        if is_customization_enabled
          if @tour_stop.present?
            remove_tour_stop(@tour_stop)
          else
            add_tour_stop()
          end
        else
          if @tour_stop.present?
            delete_array = @community.deleted_ids
            delete_array << @tour_stop.id
            @community.deleted_ids = delete_array&.compact&.uniq
            @community.save!
            
            render json: { success: true, error_code: 200, message: "Tour stop has been removed successfully", is_unit_already_available: false}, status: 200
          end
        end
      end

      private

      def is_customization_enabled
        @community.community_tour&.tour_setting&.enable_tour_customization
      end

      def skip_editing_tour_stops
        return unless @tour.present?
        @tour.update(skip_tour_editing: true) if !@tour.skip_tour_editing
      end

      def available_floorplans_list floorplans_list, available_floorplan_list = []    
        floorplans_list.each do |floorplan|
          available_units = FloorplanUnitsService.new(@community).get_floorplan_units(floorplan)      
          if available_units.count > 0
            available_floorplan_list << floorplan
          end
        end

        available_floorplan_list
      end

      def load_tour_user
        return unless params[:tour_user_id].present?

        @tour_user ||= TourUser.find_by_id params[:tour_user_id]
      end

      def load_tour_user_tour
        return unless @tour_user.present?

        @tour = CustomizeTourService.new(@community, @tour_user).get_user_tour
      end

      def remove_tour_stop(tour_stop)
        stops_count = @tour.tour_stops.where(display_stop: true, stop_type: ["unit", "amenity"]).count

        if stops_count > 1
          paths = Path.where(map_path_from_id: tour_stop.stop_id)
          paths.each do |path|
            path.path_points.destroy_all
            path.destroy if path.present?
          end

          path = tour_stop.stop_type.classify.constantize.find_by_id(tour_stop.stop_id)&.paths&.last
          path.path_points.destroy_all if path.present?
          path.destroy if path.present?

          VisitedStop.where(tour_stop_id: tour_stop.id).destroy_all
          
          if tour_stop.stop_type == "elevator"
            (Elevator.find tour_stop.stop_id).destroy if Elevator.where(id: tour_stop.stop_id).any?
          end
          
          if tour_stop.stop_type == "building_starting_point"
            (BuildingStartingPoint.find tour_stop.stop_id).destroy if BuildingStartingPoint.where(id: tour_stop.stop_id).any?
          end
        
          add_remove_stop_into_sort_hash(params[:building], params[:floor], tour_stop, "remove")

          if tour_stop.destroy
            render json: { success: true, error_code: 200, message: "Tour stop has been deleted successfully", is_unit_already_available: TourStop.where(stop_id: params[:stop_id], tour_id: @tour.id ).last.present?}, status: 200
          else
            render json: { success: false, status_code: 400, message: "Something went wrong, please try again later", data: nil }, status: 400
          end

        elsif stops_count == 1
          render json: { success: true, error_code: 200, message: "Last stop can not be removed", is_unit_already_available: TourStop.where(stop_id: params[:stop_id], tour_id: @tour.id).last.present?}, status: 200
        
        else
          render json: { success: true, error_code: 200, message: "There is no stop to remove", is_unit_already_available: TourStop.where(stop_id: params[:stop_id], tour_id: @tour.id).last.present?}, status: 200  
        end

      end

      def add_tour_stop
        if params[:stop_type] == "amenity"
          st = Amenity.find params[:stop_id]
          stName = st.name

        elsif params[:stop_type] == "elevator"
          st = Elevator.find params[:stop_id]
          stName = st.name
        else
          st = Unit.find params[:stop_id]
          stName = st.marketing_name
        end

        ts = TourStop.create(stop_type: params[:stop_type], stop_id: params[:stop_id], latitude: st.x_plot, longitude: st.y_plot, tour_id: @tour.id, name: stName)
        
        add_remove_stop_into_sort_hash(params[:building], params[:floor], ts, "add")
        
        PaperTrail::Version.create(item_type: "TourStop", item_id: st.id, event: "create", whodunnit: @community&.users&.first&.id, community_id: @community.id, company_id: @community.company.id, object: "name: '#{stName}' community_id: '#{@community.id}'")
        render json: { success: true, error_code: 200, message: "Tour stop has been added successfully", is_unit_already_available: TourStop.find_by(stop_id: params[:stop_id]).present?}, status: 200
      end

      def laod_community
        @community ||= Community.find params[:community_id]
      end

      def authorize_access
        has_access = (api_access || grant_access(decoded(params[:token]), params[:tour_user_id])) rescue false
        if has_access
          true
        else
          render :json => { :success => false, status: 401, :message => "Unauthorized, token is invalid" }
        end
      end

      def floorplan_units_service(community)
        FloorplanUnitsService.new(community)
      end

      def sort_floorplans(floorplans_list,sorting_param)

        case sorting_param
        when "floors_asc"
          list = floorplans_list.map { |f| [FloorplanUnitsService.new(@community).get_floorplan_units(f).pluck(:floor).compact.uniq.sort.first, f] }
          sorted_floorplans = list.sort_by{|f| f[0] }
          sorted_floorplans = sorted_floorplans.map{|f| f[1]}
        when "floors_desc"
          list = floorplans_list.map { |f| [FloorplanUnitsService.new(@community).get_floorplan_units(f).pluck(:floor).compact.uniq.sort.first, f] }
          sorted_floorplans = list.sort_by{|f| f[0] }.reverse
          sorted_floorplans = sorted_floorplans.map{|f| f[1]}
        when "sq_ft_asc"
          sorted_floorplans = floorplans_list.sort_by { |f| f.square_feet } 
        when "sq_ft_desc"
          sorted_floorplans = floorplans_list.sort_by { |f| -f.square_feet }
        when "price_asc"
          sorted_floorplans = floorplans_list.sort_by { |f| f.market_rent }
        when "price_desc"
          sorted_floorplans = floorplans_list.sort_by { |f| -f.market_rent }
        else
          sorted_floorplans = floorplans_list.sort_by { |f| -Unit.where(floorplan_id: f.provider_floorplan_id, available: true).count }
        end

        sorted_floorplans
      end

      def add_remove_stop_into_sort_hash(building, floor, tour_stop, request)
        unless @community.is_sitemap
          if request.eql?("add")
            if @tour.sort_hash.present? && @tour.sort_hash[building + ","+ floor.to_s].present?
              @tour.sort_hash[building + ","+ floor.to_s].push(tour_stop.id)
            else
              @tour.sort_hash[building + ","+ floor.to_s] = []
              @tour.sort_hash[building + ","+ floor.to_s].push(tour_stop.id)
            end
          elsif request.eql?("remove")
            if @tour.sort_hash.present? && @tour.sort_hash[building + ","+ floor.to_s].present?
              @tour.sort_hash[building + ","+ floor.to_s].delete(tour_stop.id)
            end
          end
        end

        @tour.save!
      end

    end
  end
end

