class Api::V2::ToursController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community
  before_action :load_tour
  before_action :load_tour_stop, only: [:delete_tour_stop]

  def index
    if @tour.present?
      render json: {success: true, data: @tour.as_json}
    else
      render json: {success: false, message: "No Tour Found"}
    end
  end

  def add_tour_stops
    begin
      update_tour_attributes
      update_community_attributes
      update_tour_stops_attributes
      update_tour_stops_status   

      render json: {success: true, message: "Tour stop updated successfully!"}
      
    rescue => exception
      render json: {success: false, message: exception.message}
    end
  end

  def delete_tour_stop
    # Can be moved to background worker
    remove_associated_path
    remove_associated_visited_stops
    remove_associated_elevator
    remove_associated_building_starting_point
    
    if @tour_stop.destroy!
      @community.set_tour_stops_status(current_pynwheel_user, "in_progress")
      render json: {success: true, message: "Tour stop deleted successfully!"}
    else
      render json: {success: false, message: "Something went wrong!"}
    end
  end

  private
    def update_tour_stops_status
      previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(TOUR_STOPS)
      @community.set_tour_stops_status(current_pynwheel_user, tour_params.dig("status"))
      FollowUpMailer.send_email_after_form_submission(@community, TOUR_STOPS, previous_status)
    end

    def update_tour_attributes
      @tour.update(name: tour_params.dig("starting_point"), max_self_tour_users: tour_params.dig("max_self_tour_users"))
    end

    def update_community_attributes
      @community.update(one_hour_email_text: community_params.dig("one_hour_email_text"))
    end

    def update_tour_stops_attributes
      tour_stop_params&.each do |param_stop|
        actual_stop = param_stop.dig("stop_type").classify.constantize.find param_stop.dig("stop_id")
        next unless actual_stop.present?
        param_stop.dig("id").present? ? update_actual_stop_attributes(actual_stop, param_stop) : create_new_tour_stop(actual_stop, param_stop)
      end
    end

    def update_actual_stop_attributes actual_stop, param_stop
      if param_stop.dig("stop_type") == "unit"
        actual_stop.update(description: param_stop.dig("description_text"), stop_description: param_stop.dig("directional_text"))
      else
        actual_stop.update(description: param_stop.dig("description_text"), directional_text: param_stop.dig("directional_text"))
      end
    end

    def create_new_tour_stop actual_stop, param_stop
      TourStop.create(
        stop_type: param_stop.dig("stop_type"), 
        stop_id: param_stop.dig("stop_id"),
        latitude: actual_stop.x_plot,
        longitude: actual_stop.y_plot,
        tour_id: @tour.id,
        name: (param_stop.dig("stop_type") == "unit") ? actual_stop.marketing_name : actual_stop.name
      )
    end

    def remove_associated_path
      paths = Path.where(map_path_from_id: @tour_stop.stop_id)

      paths.each do |path|
        path.path_points.destroy_all
        path.destroy
      end

      path = @tour_stop.stop_type.classify.constantize.find_by_id(@tour_stop.stop_id)&.paths&.last
      path&.path_points&.destroy_all
      path&.destroy
    end

    def remove_associated_visited_stops
      VisitedStop.where(tour_stop_id: @tour_stop.id).destroy_all
    end

    def remove_associated_elevator
      return unless (@tour_stop.stop_type == "elevator")
      (Elevator.find @tour_stop.stop_id).destroy if Elevator.where(id: @tour_stop.stop_id).any?
    end

    def remove_associated_building_starting_point
      return unless (@tour_stop.stop_type == "building_starting_point")
      (BuildingStartingPoint.find @tour_stop.stop_id).destroy if BuildingStartingPoint.where(id: @tour_stop.stop_id).any?
    end

    def tour_params
      params.dig("tour")
    end

    def community_params
      params.dig("tour", "community")
    end

    def tour_stop_params
      params.dig("tour", "tour_stops")
    end

    def load_community
      @community = Community.find params[:community_id]

      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Community not found', data: nil}, status: :not_found
    end

    def load_tour
      @tour = @community.community_tour || @community.create_tour
    end

    def load_tour_stop
      @tour_stop = TourStop.find params[:tour_stop_id]
      rescue ActiveRecord::RecordNotFound
        render json: {success: false, error_code: 400, message: 'Tour Stop not found', data: nil}, status: :not_found
    end

end